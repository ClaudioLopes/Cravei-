import { api } from './client';
import { User } from '../types/api';

export function getMe() {
  return api.get<User>('/users/me').then((r) => r.data);
}

export function updateMe(data: { nome?: string; foto?: string }) {
  return api.patch<User>('/users/me', data).then((r) => r.data);
}
