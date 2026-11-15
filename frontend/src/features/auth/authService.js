import { apiClient, setAccessToken } from '@/services/apiClient';

export const authService = {
  async register(data) {
    const response = await apiClient.post('/auth/register', data);
    const result = response.data?.data || response.data;
    const accessToken = result?.accessToken || response.data?.accessToken;
    const user = result?.user || response.data?.user;
    if (accessToken) {
      setAccessToken(accessToken);
    }
    return { ...result, user, accessToken };
  },

  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    const result = response.data?.data || response.data;
    const accessToken = result?.accessToken || response.data?.accessToken;
    const user = result?.user || response.data?.user;
    if (accessToken) {
      setAccessToken(accessToken);
    }
    return { ...result, user, accessToken };
  },

  async adminLogin(credentials) {
    const response = await apiClient.post('/admin/login', credentials);
    const result = response.data?.data || response.data;
    const accessToken = result?.accessToken || response.data?.accessToken;
    const user = result?.user || response.data?.user;
    if (accessToken) {
      setAccessToken(accessToken);
    }
    return { ...result, user, accessToken };
  },

  async checkInitialAdminStatus() {
    const response = await apiClient.get('/admin/initial-registration/status');
    return response.data?.data || response.data;
  },

  async registerInitialSuperAdmin(data) {
    const response = await apiClient.post('/admin/initial-registration', data);
    return response.data?.data || response.data;
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },

  async getMe() {
    const response = await apiClient.get('/auth/me');
    const result = response.data?.data || response.data;
    const user = result?.user || result;
    return { ...result, user };
  },

  async refresh() {
    const response = await apiClient.post('/auth/refresh');
    const result = response.data?.data || response.data;
    const accessToken = result?.accessToken || response.data?.accessToken;
    const user = result?.user || response.data?.user;
    if (accessToken) {
      setAccessToken(accessToken);
    }
    return { ...result, user, accessToken };
  },

  async forgotPassword(email) {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data?.data || response.data;
  },

  async resetPassword({ token, password }) {
    const response = await apiClient.post('/auth/reset-password', { token, password });
    return response.data?.data || response.data;
  },

  async changePassword({ currentPassword, newPassword }) {
    const response = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    const result = response.data?.data || response.data;
    const accessToken = result?.accessToken || response.data?.accessToken;
    if (accessToken) {
      setAccessToken(accessToken);
    }
    return result;
  },

  async verifyEmail(token) {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data?.data || response.data;
  }
};

export default authService;

