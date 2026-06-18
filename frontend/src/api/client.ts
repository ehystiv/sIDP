import axios from 'axios';
import { authState, clearTokens } from '../stores/auth';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  if (authState.accessToken) {
    config.headers.Authorization = `Bearer ${authState.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearTokens();
    }
    return Promise.reject(error);
  },
);

export default api;
