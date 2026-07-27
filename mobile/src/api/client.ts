import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '../lib/token-storage';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const api = axios.create({ baseURL: API_URL });

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  unauthorizedHandler = fn;
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getItem('accessToken');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (token) {
            originalRequest.headers.set('Authorization', `Bearer ${token}`);
            resolve(api(originalRequest));
          } else {
            reject(error);
          }
        });
      });
    }

    isRefreshing = true;
    try {
      const refreshToken = await tokenStorage.getItem('refreshToken');
      if (!refreshToken) throw error;

      const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      await tokenStorage.setItem('accessToken', data.accessToken);
      await tokenStorage.setItem('refreshToken', data.refreshToken);

      pendingQueue.forEach((resolveQueued) => resolveQueued(data.accessToken));
      pendingQueue = [];

      originalRequest.headers.set('Authorization', `Bearer ${data.accessToken}`);
      return api(originalRequest);
    } catch (refreshError) {
      pendingQueue.forEach((resolveQueued) => resolveQueued(null));
      pendingQueue = [];
      await tokenStorage.removeItem('accessToken');
      await tokenStorage.removeItem('refreshToken');
      unauthorizedHandler?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
