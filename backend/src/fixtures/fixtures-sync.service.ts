import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { TurnoService } from '../standings/turno.service';
import {
  FIXTURES_PROVIDER,
  FixturesProvider,
  NormalizedMatch,
} from './fixtures-provider.interface';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RESCHEDULE_THRESHOLD_DAYS = Number(
  process.env.RESCHEDULE_THRESHOLD_DAYS ?? 3,
);
const ULTIMA_RODADA_TURNO_1 = 19;

@Injectable()
export class FixturesSyncService {
  private readonly logger = new Logger(FixturesSyncService.name);

  constructor(
    @Inject(FIXTURES_PROVIDER) private readonly fixturesProvider: FixturesProvider,
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
    private readonly turnoService: TurnoService,
  ) {}

  @Cron(process.env.FIXTURES_SYNC_CRON ?? '*/5 * * * *')
  async handleCron() {
    try {
      await this.sync();
    } catch (error) {
      this.logger.error('Falha ao sincronizar jogos com a fonte externa.', error as Error);
    }
  }

  async sync(): Promise<void> {
    const normalizedRound = await this.fixturesProvider.getCurrentRound();
    if (!normalizedRound.numero || normalizedRound.matches.length === 0) {
      this.logger.warn('Sincronização ignorada: fonte não retornou jogos.');
      return;
    }

    // getCurrentRound() só reinclui jogos de rodadas passadas enquanto a FONTE ainda não os
    // marcou como encerrados — se o status da fonte virar "FINISHED" bem na janela em que a
    // rodada atual avança, o jogo cai fora desse retorno permanentemente e nosso registro local
    // (se ainda não tiver sido atualizado a tempo) fica preso em AGENDADO/EM_ANDAMENTO pra
    // sempre. Aqui, resincroniza explicitamente qualquer rodada nossa ainda não fechada — o
    // getRound() do provider não filtra por status, então corrige esses presos.
    await this.resyncRodadasAbertas(normalizedRound.numero);

    const season = await this.getOrCreateActiveSeason();
    const turnoAtual = normalizedRound.numero <= ULTIMA_RODADA_TURNO_1 ? 1 : 2;

    if (season.turnoAtual !== turnoAtual) {
      await this.prisma.season.update({
        where: { id: season.id },
        data: { turnoAtual: turnoAtual },
      });
    }

    // O provider pode devolver jogos de mais de uma rodada (jogos adiados de rodadas
    // anteriores à rodada atual continuam sendo sincronizados — ver FootballDataProvider).
    // Cada jogo é roteado para a SUA rodada real, não necessariamente a "rodada atual".
    const jogosPorRodada = new Map<number, NormalizedMatch[]>();
    for (const match of normalizedRound.matches) {
      const lista = jogosPorRodada.get(match.roundNumber) ?? [];
      lista.push(match);
      jogosPorRodada.set(match.roundNumber, lista);
    }

    for (const [numero, matches] of jogosPorRodada) {
      const turno = numero <= ULTIMA_RODADA_TURNO_1 ? 1 : 2;
      const ehRodadaAtual = numero === normalizedRound.numero;
      const round = await this.getOrCreateRound(season.id, numero, turno, matches, ehRodadaAtual);

      for (const match of matches) {
        await this.upsertMatch(round.id, match);
      }

      await this.recomputeRoundClosure(round.id, season.id, turno);
    }
  }

  // Resincroniza (via getRound, sem o filtro de "já encerrado" que getCurrentRound aplica)
  // qualquer rodada nossa anterior à atual que ainda não esteja marcada como encerrada — pega os
  // presos que caíram fora do retorno normal de getCurrentRound() (ver comentário em sync()).
  private async resyncRodadasAbertas(numeroRodadaAtual: number): Promise<void> {
    const rodadasAbertas = await this.prisma.round.findMany({
      where: { numero: { lt: numeroRodadaAtual }, encerrada: false },
      select: { numero: true },
    });

    for (const { numero } of rodadasAbertas) {
      try {
        await this.syncRoundByNumber(numero);
      } catch (error) {
        this.logger.error(`Falha ao resincronizar a rodada ${numero} presa.`, error as Error);
      }
    }
  }

  // Busca e grava uma rodada específica sob demanda (usado para navegar rodadas passadas no
  // app, que podem nunca ter passado pelo fluxo normal de `sync()` por já estarem encerradas).
  // Retorna null se a fonte não tiver dados para essa rodada (número inválido, por exemplo).
  async syncRoundByNumber(numero: number) {
    const normalized = await this.fixturesProvider.getRound(numero);
    if (!normalized.matches.length) {
      return null;
    }

    const season = await this.getOrCreateActiveSeason();
    const turno = numero <= ULTIMA_RODADA_TURNO_1 ? 1 : 2;
    const round = await this.getOrCreateRound(season.id, numero, turno, normalized.matches, false);

    for (const match of normalized.matches) {
      await this.upsertMatch(round.id, match);
    }
    await this.recomputeRoundClosure(round.id, season.id, turno);

    return this.prisma.round.findUnique({
      where: { id: round.id },
      include: { matches: { orderBy: { dataHoraPrevista: 'asc' } } },
    });
  }

  private async getOrCreateActiveSeason() {
    const existing = await this.prisma.season.findFirst({
      orderBy: { ano: 'desc' },
    });
    if (existing) {
      return existing;
    }

    const ano = new Date().getFullYear();
    return this.prisma.season.create({
      data: { nome: `Brasileirão Série A ${ano}`, ano, turnoAtual: 1 },
    });
  }

  // `isCurrent` só é true para a rodada detectada como "rodada atual" pelo provider — rodadas de
  // jogos adiados de rodadas passadas (stragglers) são atualizadas normalmente, mas nunca marcadas
  // como atual nem tiram essa marca de quem já é a rodada atual.
  private async getOrCreateRound(
    seasonId: string,
    numero: number,
    turno: number,
    matches: NormalizedMatch[],
    isCurrent: boolean,
  ) {
    const existing = await this.prisma.round.findUnique({
      where: { seasonId_numero: { seasonId, numero } },
    });

    if (existing) {
      if (isCurrent && !existing.atual) {
        await this.prisma.round.updateMany({
          where: { seasonId, atual: true },
          data: { atual: false },
        });
        return this.prisma.round.update({
          where: { id: existing.id },
          data: { atual: true },
        });
      }
      return existing;
    }

    if (isCurrent) {
      await this.prisma.round.updateMany({
        where: { seasonId, atual: true },
        data: { atual: false },
      });
    }

    const primeiroJogoOriginal = matches.reduce<Date>(
      (earliest, match) => (match.dataHora < earliest ? match.dataHora : earliest),
      matches[0].dataHora,
    );

    return this.prisma.round.create({
      data: { seasonId, numero, turno, primeiroJogoOriginal, atual: isCurrent },
    });
  }

  private async upsertMatch(roundId: string, match: NormalizedMatch) {
    const existing = await this.prisma.match.findUnique({
      where: { externalId: match.externalId },
    });

    const eraEncerrado = existing?.status === MatchStatus.ENCERRADO;

    if (!existing) {
      const created = await this.prisma.match.create({
        data: {
          roundId,
          externalId: match.externalId,
          timeCasa: match.timeCasa,
          timeFora: match.timeFora,
          crestCasa: match.crestCasa,
          crestFora: match.crestFora,
          dataHoraOriginal: match.dataHora,
          dataHoraPrevista: match.dataHora,
          status: match.status as MatchStatus,
          placarCasa: match.placarCasa,
          placarFora: match.placarFora,
        },
      });
      if (created.status === MatchStatus.ENCERRADO) {
        await this.scoringService.calculateForMatch(created.id);
      }
      return created;
    }

    const diffDays =
      Math.abs(match.dataHora.getTime() - existing.dataHoraOriginal.getTime()) /
      MS_PER_DAY;
    const prazoIndividual =
      diffDays > RESCHEDULE_THRESHOLD_DAYS ? match.dataHora : null;

    // regra 5.1: jogo reagendado >3 dias fica com status "adiado" até o novo horário chegar,
    // mesmo que a fonte ainda diga "agendado"; roundId NUNCA é alterado (pontua na rodada original)
    const foiReagendadoAgora = prazoIndividual !== null && match.status === 'AGENDADO';
    const status: MatchStatus = foiReagendadoAgora
      ? MatchStatus.ADIADO
      : (match.status as MatchStatus);

    const updated = await this.prisma.match.update({
      where: { id: existing.id },
      data: {
        dataHoraPrevista: match.dataHora,
        prazoIndividual,
        status,
        placarCasa: match.placarCasa,
        placarFora: match.placarFora,
        crestCasa: match.crestCasa,
        crestFora: match.crestFora,
      },
    });

    if (!eraEncerrado && updated.status === MatchStatus.ENCERRADO) {
      await this.scoringService.calculateForMatch(updated.id);
    }

    return updated;
  }

  private async recomputeRoundClosure(roundId: string, seasonId: string, turno: number) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: { matches: true },
    });
    if (!round || round.matches.length === 0) {
      return;
    }

    const todasEncerradas = round.matches.every(
      (m) => m.status === MatchStatus.ENCERRADO,
    );
    if (todasEncerradas && !round.encerrada) {
      await this.prisma.round.update({
        where: { id: roundId },
        data: { encerrada: true },
      });
      if (round.numero === ULTIMA_RODADA_TURNO_1 || round.numero === 38) {
        await this.turnoService.tryCloseTurno(seasonId, turno);
      }
    }
  }
}
