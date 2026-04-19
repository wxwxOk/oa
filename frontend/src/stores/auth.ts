import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';

interface UserInfo {
  id: number;
  username: string;
  realName: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
}

// 模块级变量，避免 Pinia 序列化 Promise 的问题
let pendingRefresh: Promise<void> | null = null;

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem('oa_access') || '',
    refreshToken: localStorage.getItem('oa_refresh') || '',
    user: JSON.parse(localStorage.getItem('oa_user') || 'null') as UserInfo | null,
    lastProfileFetch: 0,
  }),
  getters: {
    isLogin: (s) => !!s.accessToken,
    isAdmin: (s) => s.user?.roles.includes('ADMIN') ?? false,
  },
  actions: {
    async login(username: string, password: string) {
      const { data } = await api.post('/auth/login', { username, password });
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;
      this.user = data.user;
      localStorage.setItem('oa_access', data.accessToken);
      localStorage.setItem('oa_refresh', data.refreshToken);
      localStorage.setItem('oa_user', JSON.stringify(data.user));
    },
    async doRefresh(): Promise<string> {
      const { data } = await api.post('/auth/refresh', { refreshToken: this.refreshToken });
      this.accessToken = data.accessToken;
      localStorage.setItem('oa_access', data.accessToken);
      return data.accessToken;
    },
    async fetchProfile() {
      const { data } = await api.get('/auth/profile');
      this.user = data;
      localStorage.setItem('oa_user', JSON.stringify(data));
    },
    logout() {
      this.accessToken = '';
      this.refreshToken = '';
      this.user = null;
      localStorage.removeItem('oa_access');
      localStorage.removeItem('oa_refresh');
      localStorage.removeItem('oa_user');
    },
    hasPerm(code: string): boolean {
      if (!this.user) return false;
      if (this.user.roles.includes('ADMIN')) return true;
      return this.user.permissions.includes(code);
    },
    async maybeRefreshProfile() {
      if (!this.accessToken) return;
      if (Date.now() - this.lastProfileFetch < 60_000) return;
      if (pendingRefresh) return pendingRefresh;
      pendingRefresh = this._doRefreshProfile();
      try {
        await pendingRefresh;
      } finally {
        pendingRefresh = null;
      }
    },
    async _doRefreshProfile() {
      try {
        await this.fetchProfile();
        this.lastProfileFetch = Date.now();
      } catch {
        // 401 由 axios 拦截器处理，此处静默
      }
    },
  },
});
