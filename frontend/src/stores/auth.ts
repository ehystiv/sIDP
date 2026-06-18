import { reactive } from 'vue';
import api from '../api/client';
import { decodeJwtPayload } from '../lib/jwt';
import type { Tokens } from '../types';

const STORAGE_KEY = 'sidp.tokens';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  username: string | null;
}

function buildState(tokens: Tokens | null): AuthState {
  if (!tokens) {
    return { accessToken: null, refreshToken: null, userId: null, username: null };
  }
  const payload = decodeJwtPayload(tokens.accessToken);
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    userId: payload?.sub ?? null,
    username: payload?.username ?? null,
  };
}

function loadTokens(): Tokens | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Tokens) : null;
}

export const authState = reactive<AuthState>(buildState(loadTokens()));

export function setTokens(tokens: Tokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  Object.assign(authState, buildState(tokens));
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(authState, buildState(null));
}

export async function login(username: string, password: string) {
  const { data } = await api.post<Tokens>('/auth/signin', { username, password });
  setTokens(data);
}

export async function logout() {
  try {
    await api.get('/auth/logout');
  } finally {
    clearTokens();
  }
}
