import axios from 'axios';

export const TOKEN_KEY = 'meridian_token';

export const api = axios.create({ baseURL: '/api' });

// Attach the JWT on every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, drop the session and bounce to login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    // An old account's in-flight request must not log the new account out.
    if (err.response?.status === 401 && currentToken && err.config?.headers?.Authorization === `Bearer ${currentToken}` && !location.pathname.startsWith('/login')) {
      localStorage.removeItem(TOKEN_KEY);
      if (!location.pathname.startsWith('/login')) location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export function apiError(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) return err.response?.data?.error ?? fallback;
  return fallback;
}
