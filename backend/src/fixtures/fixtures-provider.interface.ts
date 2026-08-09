export type NormalizedMatchStatus = 'AGENDADO' | 'EM_ANDAMENTO' | 'ENCERRADO';

export interface NormalizedMatch {
  externalId: string;
  roundNumber: number;
  timeCasa: string;
  timeFora: string;
  crestCasa: string | null;
  crestFora: string | null;
  dataHora: Date;
  status: NormalizedMatchStatus;
  placarCasa: number | null;
  placarFora: number | null;
}

export interface NormalizedRound {
  numero: number;
  totalRodadas: number;
  matches: NormalizedMatch[];
}

export const FIXTURES_PROVIDER = Symbol('FIXTURES_PROVIDER');

// Abstração recomendada pela seção 6 do documento técnico: isola o backend da fonte de dados
// concreta, permitindo trocar a lib gratuita por uma API paga sem tocar no restante do sistema.
export interface FixturesProvider {
  getCurrentRound(): Promise<NormalizedRound>;
  // Busca uma rodada específica (passada, atual ou futura) por número — usado para navegar
  // rodadas anteriores no app, mesmo que ainda não tenham sido sincronizadas no banco.
  getRound(numero: number): Promise<NormalizedRound>;
}
