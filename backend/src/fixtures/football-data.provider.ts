import { Injectable, Logger } from '@nestjs/common';
import {
  FixturesProvider,
  NormalizedMatch,
  NormalizedMatchStatus,
  NormalizedRound,
} from './fixtures-provider.interface';

// football-data.org v4 — tier gratuito, precisa de token (cadastro grátis em
// https://www.football-data.org/client/register). Documentação: https://www.football-data.org/documentation/api
// Traz horário oficial (UTC) de cada jogo, essencial para as regras 5.1 (prazo de palpite) e 5.5
// (notificação) — diferente da fonte anterior (`campeonato-brasileiro-api`), que não tinha essa informação.
interface SourceTeam {
  id: number;
  name: string;
}

interface SourceMatch {
  id: number;
  utcDate: string; // ISO 8601 em UTC, ex.: "2026-04-25T21:30:00Z"
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELLED';
  matchday: number;
  homeTeam: SourceTeam;
  awayTeam: SourceTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
  };
}

interface SourceMatchesResponse {
  matches: SourceMatch[];
}

const JOGO_ENCERRADO_STATUS = new Set(['FINISHED']);
const JOGO_EM_ANDAMENTO_STATUS = new Set(['IN_PLAY', 'PAUSED']);
const RODADA_VAZIA: NormalizedRound = { numero: 0, totalRodadas: 38, matches: [] };

function mapStatus(status: SourceMatch['status']): NormalizedMatchStatus {
  if (JOGO_ENCERRADO_STATUS.has(status)) return 'ENCERRADO';
  if (JOGO_EM_ANDAMENTO_STATUS.has(status)) return 'EM_ANDAMENTO';
  return 'AGENDADO';
}

function toNormalizedMatch(match: SourceMatch): NormalizedMatch {
  return {
    externalId: String(match.id),
    roundNumber: match.matchday,
    timeCasa: match.homeTeam.name,
    timeFora: match.awayTeam.name,
    dataHora: new Date(match.utcDate),
    status: mapStatus(match.status),
    placarCasa: match.score.fullTime.home,
    placarFora: match.score.fullTime.away,
  };
}

@Injectable()
export class FootballDataProvider implements FixturesProvider {
  private readonly logger = new Logger(FootballDataProvider.name);
  private readonly token = process.env.FOOTBALL_DATA_API_TOKEN;
  private readonly competition = process.env.FOOTBALL_DATA_COMPETITION ?? 'BSA';

  async getCurrentRound(): Promise<NormalizedRound> {
    const data = await this.buscar();
    if (!data) return RODADA_VAZIA;

    const totalRodadas = Math.max(...data.matches.map((m) => m.matchday));
    const rodadaAtual = this.detectarRodadaAtual(data.matches, totalRodadas);

    // Além dos jogos da rodada atual, incluímos qualquer jogo ainda não encerrado de rodadas
    // anteriores (adiados soltos) — assim eles continuam sendo sincronizados e pontuando quando
    // finalmente rolarem, mesmo depois que a "rodada atual" já tiver avançado além deles.
    const relevantes = data.matches.filter(
      (m) => m.matchday === rodadaAtual || (m.matchday < rodadaAtual && !JOGO_ENCERRADO_STATUS.has(m.status)),
    );

    return {
      numero: rodadaAtual,
      totalRodadas,
      matches: relevantes.map(toNormalizedMatch),
    };
  }

  // Busca uma rodada específica por número — usada para navegar rodadas passadas no app,
  // mesmo que ainda não tenham sido sincronizadas no banco.
  async getRound(numero: number): Promise<NormalizedRound> {
    const data = await this.buscar(numero);
    if (!data || data.matches.length === 0) return { ...RODADA_VAZIA, numero };

    return {
      numero,
      totalRodadas: 38,
      matches: data.matches.filter((m) => m.matchday === numero).map(toNormalizedMatch),
    };
  }

  private async buscar(matchday?: number): Promise<SourceMatchesResponse | null> {
    if (!this.token) {
      this.logger.warn(
        'FOOTBALL_DATA_API_TOKEN não configurado — cadastre-se grátis em ' +
          'https://www.football-data.org/client/register e defina a variável de ambiente.',
      );
      return null;
    }

    const url = new URL(`https://api.football-data.org/v4/competitions/${this.competition}/matches`);
    if (matchday) {
      url.searchParams.set('matchday', String(matchday));
    }

    const response = await fetch(url, { headers: { 'X-Auth-Token': this.token } });
    this.logarLimiteDeRequisicoes(response);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      this.logger.warn(
        `Rate limit da football-data.org atingido (429)${retryAfter ? ` — aguardar ${retryAfter}s` : ''}. Requisição adiada.`,
      );
      return null;
    }

    if (!response.ok) {
      throw new Error(`football-data.org respondeu ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as SourceMatchesResponse;
    if (!data.matches || data.matches.length === 0) {
      this.logger.warn('football-data.org não retornou nenhuma partida.');
      return null;
    }

    return data;
  }

  // Tier gratuito é limitado a poucas requisições/minuto; loga a cota restante informada pela
  // própria API para dar visibilidade antes de eventualmente tomar um 429.
  private logarLimiteDeRequisicoes(response: Response): void {
    const restantes = response.headers.get('X-Requests-Available-Minute');
    if (restantes === null) return;

    const restantesNum = Number(restantes);
    if (Number.isFinite(restantesNum) && restantesNum <= 2) {
      this.logger.warn(`football-data.org: só restam ${restantes} requisições neste minuto.`);
    } else {
      this.logger.debug(`football-data.org: ${restantes} requisições restantes neste minuto.`);
    }
  }

  // rodada "atual" = a primeira rodada em que a MAIORIA dos jogos ainda não terminou.
  // Um jogo adiado isolado (1 de 10, por exemplo) não deve travar a detecção nas rodadas
  // seguintes — só tratamos a rodada como "ainda em andamento" se a maior parte dela
  // realmente não rolou ainda. Jogos adiados soltos continuam sendo sincronizados (ver
  // getCurrentRound: incluímos jogos não encerrados de rodadas anteriores também).
  private detectarRodadaAtual(matches: SourceMatch[], totalRodadas: number): number {
    for (let rodada = 1; rodada <= totalRodadas; rodada++) {
      const jogosDaRodada = matches.filter((m) => m.matchday === rodada);
      if (jogosDaRodada.length === 0) continue;
      const naoEncerrados = jogosDaRodada.filter((m) => !JOGO_ENCERRADO_STATUS.has(m.status)).length;
      const fracaoNaoEncerrados = naoEncerrados / jogosDaRodada.length;
      if (fracaoNaoEncerrados > 0.5) {
        return rodada;
      }
    }
    return totalRodadas;
  }
}
