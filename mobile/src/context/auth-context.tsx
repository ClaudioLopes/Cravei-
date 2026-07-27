import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { tokenStorage } from '../lib/token-storage';
import { setUnauthorizedHandler } from '../api/client';
import * as authApi from '../api/auth';
import * as usersApi from '../api/users';
import { User } from '../types/api';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  register: (nome: string, email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function persistSession(accessToken: string, refreshToken: string) {
  await tokenStorage.setItem('accessToken', accessToken);
  await tokenStorage.setItem('refreshToken', refreshToken);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(async () => {
    await tokenStorage.removeItem('accessToken');
    await tokenStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const accessToken = await tokenStorage.getItem('accessToken');
      if (!accessToken) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await usersApi.getMe();
        setUser(me);
      } catch {
        await clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [clearSession]);

  const login = useCallback(async (email: string, senha: string) => {
    const res = await authApi.login(email, senha);
    await persistSession(res.accessToken, res.refreshToken);
    setUser(res.user);
  }, []);

  const register = useCallback(async (nome: string, email: string, senha: string) => {
    const res = await authApi.register(nome, email, senha);
    await persistSession(res.accessToken, res.refreshToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider.');
  }
  return ctx;
}
