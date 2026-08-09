import { api } from './client';
import { Group, GroupMember, ScoringConfig, User } from '../types/api';

export interface PredictionStatusEntry {
  user: Pick<User, 'id' | 'nome' | 'foto'>;
  enviados: number;
  total: number;
  completo: boolean;
}

export function createGroup(data: {
  nome: string;
  tipo?: 'PUBLICO' | 'PRIVADO';
  scoringConfig?: ScoringConfig;
  podioTamanho?: 1 | 3;
}) {
  return api.post<Group>('/groups', data).then((r) => r.data);
}

export function getMyGroups() {
  return api.get<Group[]>('/groups/me').then((r) => r.data);
}

export function getGroupByCode(codigo: string) {
  return api.get<Group>(`/groups/by-code/${codigo}`).then((r) => r.data);
}

export function joinGroup(groupId: string, codigoConvite: string) {
  return api.post<Group>(`/groups/${groupId}/join`, { codigoConvite }).then((r) => r.data);
}

export function getGroup(groupId: string) {
  return api.get<Group>(`/groups/${groupId}`).then((r) => r.data);
}

export function getGroupMembers(groupId: string) {
  return api.get<GroupMember[]>(`/groups/${groupId}/members`).then((r) => r.data);
}

export function updateScoringRule(groupId: string, config: ScoringConfig) {
  return api.patch<Group>(`/groups/${groupId}/scoring-rule`, config).then((r) => r.data);
}

export function getPredictionsStatus(groupId: string, roundId: string) {
  return api
    .get<PredictionStatusEntry[]>(`/groups/${groupId}/rounds/${roundId}/predictions-status`)
    .then((r) => r.data);
}
