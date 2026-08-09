export interface User {
  id: string;
  nome: string;
  email: string;
  foto: string | null;
  criadoEm: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export type ScoringType = 'placar_exato' | 'resultado_simples' | 'camadas';

export interface ScoringConfig {
  tipo: ScoringType;
  pontosPlacarExato?: number;
  pontosResultado?: number;
}

export type GroupTipo = 'PUBLICO' | 'PRIVADO';
export type GroupPapel = 'ADMIN' | 'MEMBRO';

export interface Group {
  id: string;
  nome: string;
  tipo: GroupTipo;
  codigoConvite: string;
  donoId: string;
  scoringConfig: ScoringConfig;
  podioTamanho: number;
  criadoEm: string;
  meuPapel?: GroupPapel;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  papel: GroupPapel;
  entrouEm: string;
  user: Pick<User, 'id' | 'nome' | 'foto'>;
}

export type MatchStatus = 'AGENDADO' | 'ADIADO' | 'EM_ANDAMENTO' | 'ENCERRADO';

export interface Match {
  id: string;
  roundId: string;
  externalId: string;
  timeCasa: string;
  timeFora: string;
  crestCasa: string | null;
  crestFora: string | null;
  dataHoraOriginal: string;
  dataHoraPrevista: string;
  prazoIndividual: string | null;
  status: MatchStatus;
  placarCasa: number | null;
  placarFora: number | null;
}

export interface Round {
  id: string;
  seasonId: string;
  numero: number;
  turno: number;
  primeiroJogoOriginal: string;
  atual: boolean;
  encerrada: boolean;
  matches: Match[];
}

export interface Prediction {
  id: string;
  matchId: string;
  userId: string;
  placarCasaPalpite: number;
  placarForaPalpite: number;
  criadoEm: string;
  editadoEm: string;
  user?: Pick<User, 'id' | 'nome' | 'foto'>;
}

export interface StandingEntry {
  id: string;
  posicao: number;
  groupId: string;
  turno: number;
  userId: string;
  pontosTotais: number;
  user: Pick<User, 'id' | 'nome' | 'foto'>;
}

export interface TurnoWinner {
  id: string;
  groupId: string;
  turno: number;
  posicao: number;
  userId: string;
  pontosFinais: number;
  definidoEm: string;
  user: Pick<User, 'id' | 'nome' | 'foto'>;
}
