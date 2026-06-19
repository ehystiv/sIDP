import axios, { type InternalAxiosRequestConfig } from 'axios';
import { authState, clearTokens, setTokens } from '../stores/auth';
import type { Tokens } from '../types';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  if (authState.accessToken) {
    config.headers.Authorization = `Bearer ${authState.accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<Tokens> | null = null;

function refreshTokens(): Promise<Tokens> {
  if (!refreshPromise) {
    refreshPromise = axios
      .get<Tokens>('/api/auth/refresh', {
        headers: { Authorization: `Bearer ${authState.refreshToken}` },
      })
      .then(({ data }) => {
        setTokens(data);
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status === 401 &&
      authState.refreshToken &&
      config &&
      !config._retried &&
      config.url !== '/auth/refresh'
    ) {
      config._retried = true;
      try {
        const tokens = await refreshTokens();
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return api(config);
      } catch {
        clearTokens();
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401) {
      clearTokens();
    }
    return Promise.reject(error);
  },
);

export default api;
