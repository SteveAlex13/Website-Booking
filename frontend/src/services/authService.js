import api from './api';

export const authService = {
  async register(data) {
    const res = await api.post('/register', data);
    if (res.data?.token) {
      localStorage.setItem('auth_token', res.data.token);
      localStorage.setItem('user_data', JSON.stringify(res.data.user));
    }
    return res;
  },

  async login(email, password) {
    const res = await api.post('/login', { email, password });
    if (res.data?.token) {
      localStorage.setItem('auth_token', res.data.token);
      localStorage.setItem('user_data', JSON.stringify(res.data.user));
    }
    return res;
  },

  async logout() {
    try {
      await api.post('/logout');
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
  },

  async getUser() {
    return await api.get('/user');
  },

  async updateProfile(data) {
    const res = await api.put('/user/profile', data);
    if (res.data) {
      localStorage.setItem('user_data', JSON.stringify(res.data));
    }
    return res;
  },

  getCurrentUser() {
    const user = localStorage.getItem('user_data');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
  },

  async getCancellationKey() {
    return await api.get('/user/cancellation-key');
  },

  async generateCancellationKey() {
    return await api.post('/user/generate-cancellation-key');
  },
};

