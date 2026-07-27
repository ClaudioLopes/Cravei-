import { api } from './client';
import { Prediction } from '../types/api';

export function upsertPrediction(data: {
  matchId: string;
  placarCasaPalpite: number;
  placarForaPalpite: number;
}) {
  return api.post<Prediction>('/predictions', data).then((r) => r.data);
}

export function getMyPredictions(roundId: string) {
  return api.get<Prediction[]>(`/predictions/me/${roundId}`).then((r) => r.data);
}

export function getMatchPredictions(matchId: string) {
  return api.get<Prediction[]>(`/predictions/match/${matchId}`).then((r) => r.data);
}
