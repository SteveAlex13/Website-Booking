import axios from 'axios';
import { loadingBar } from '../utils/loadingBar';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to attach Bearer token
api.interceptors.request.use(
  (config) => {
    loadingBar.start(); // top loading bar runs until the response (or error) arrives
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    loadingBar.done();
    return response.data;
  },
  (error) => {
    loadingBar.done();
    if (error.response) {
      if (error.response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        // If not already on login page, redirect
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

