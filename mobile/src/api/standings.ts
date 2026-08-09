import { api } from './client';
import { StandingEntry, TurnoWinner } from '../types/api';

export function getStandings(groupId: string, turno?: number) {
  return api
    .get<StandingEntry[]>(`/groups/${groupId}/standings`, { params: { turno } })
    .then((r) => r.data);
}

export function getStandingsHistory(groupId: string) {
  return api.get<TurnoWinner[]>(`/groups/${groupId}/standings/history`).then((r) => r.data);
}

export function getTurnoWinner(groupId: string, turno: number) {
  return api.get<TurnoWinner[]>(`/groups/${groupId}/turno-winner/${turno}`).then((r) => r.data);
}
