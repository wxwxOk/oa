import axios, { type AxiosInstance } from 'axios';
import { Notify } from 'quasar';
import { useAuthStore } from 'src/stores/auth';
import { boot } from 'quasar/wrappers';
import type { AxiosRequestConfig } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: process.env.API_BASE,
  timeout: 15000,
});

interface RetryableAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
  skipAuthErrorNotify?: boolean;
}

api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let waiters: Array<(t: string) => void> = [];

api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const auth = useAuthStore();
    const original = (error.config || {}) as RetryableAxiosRequestConfig;
    if (error.response?.status === 401 && !original._retry && !original.skipAuthRefresh && auth.refreshToken) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          waiters.push((t) => {
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${t}`;
            resolve(api(original));
          });
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const token = await auth.doRefresh();
        waiters.forEach((fn) => fn(token));
        waiters = [];
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (e) {
        auth.logout();
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    if (error.response?.status === 401 && original.skipAuthErrorNotify) {
      return Promise.reject(error);
    }
    const msg = error.response?.data?.message || error.message;
    Notify.create({ type: 'negative', message: msg });
    return Promise.reject(error);
  },
);

export default boot(({ app }) => {
  app.config.globalProperties.$api = api;
});

export { api };
