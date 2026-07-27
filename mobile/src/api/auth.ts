import { api } from './client';
import { AuthResponse } from '../types/api';

export function register(nome: string, email: string, senha: string) {
  return api
    .post<AuthResponse>('/auth/register', { nome, email, senha })
    .then((r) => r.data);
}

export function login(email: string, senha: string) {
  return api.post<AuthResponse>('/auth/login', { email, senha }).then((r) => r.data);
}
