import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FixturesSyncService } from '../fixtures/fixtures-sync.service';

@Injectable()
export class RoundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fixturesSyncService: FixturesSyncService,
  ) {}

  async getCurrent() {
    const round = await this.prisma.round.findFirst({
      where: { atual: true },
      include: { matches: { orderBy: { dataHoraPrevista: 'asc' } } },
    });
    if (!round) {
      throw new NotFoundException(
        'Nenhuma rodada sincronizada ainda. Aguarde a próxima sincronização de jogos.',
      );
    }
    return round;
  }

  async getMatches(roundId: string) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: { matches: { orderBy: { dataHoraPrevista: 'asc' } } },
    });
    if (!round) {
      throw new NotFoundException('Rodada não encontrada.');
    }
    return round.matches;
  }

  // Navegação de rodadas passadas/futuras: busca no banco primeiro; se a rodada nunca foi
  // sincronizada (comum para rodadas já encerradas, que não passam pelo fluxo normal de
  // `sync()`), busca sob demanda na fonte externa e grava para as próximas consultas.
  async getByNumber(numero: number) {
    const season = await this.prisma.season.findFirst({ orderBy: { ano: 'desc' } });
    if (season) {
      const existente = await this.prisma.round.findUnique({
        where: { seasonId_numero: { seasonId: season.id, numero } },
        include: { matches: { orderBy: { dataHoraPrevista: 'asc' } } },
      });
      if (existente) {
        return existente;
      }
    }

    const sincronizada = await this.fixturesSyncService.syncRoundByNumber(numero);
    if (!sincronizada) {
      throw new NotFoundException(`Rodada ${numero} não encontrada na fonte de dados.`);
    }
    return sincronizada;
  }
}
