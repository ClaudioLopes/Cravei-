import { api } from './client';
import { Match, Round } from '../types/api';

export function getCurrentRound() {
  return api.get<Round>('/rounds/current').then((r) => r.data);
}

export function getRoundMatches(roundId: string) {
  return api.get<Match[]>(`/rounds/${roundId}/matches`).then((r) => r.data);
}

export function getRoundByNumber(numero: number) {
  return api.get<Round>(`/rounds/numero/${numero}`).then((r) => r.data);
}
