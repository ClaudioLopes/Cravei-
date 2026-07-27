import { Match, Round } from '../types/api';

export function effectiveDeadline(match: Match, round: Pick<Round, 'primeiroJogoOriginal'>): Date {
  return new Date(match.prazoIndividual ?? round.primeiroJogoOriginal);
}

export function formatCountdown(deadline: Date, now: Date = new Date()): string {
  const diffMs = deadline.getTime() - now.getTime();
  if (diffMs <= 0) return 'Encerrado';

  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h restantes`;
  if (hours > 0) return `${hours}h ${minutes}min restantes`;
  return `${minutes}min restantes`;
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function scoringConfigLabel(tipo: string): string {
  switch (tipo) {
    case 'placar_exato':
      return 'Placar exato';
    case 'resultado_simples':
      return 'Resultado simples';
    case 'camadas':
      return 'Camadas (placar exato + resultado)';
    default:
      return tipo;
  }
}
