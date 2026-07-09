import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem('adminToken');
    const userToken = localStorage.getItem('userToken');
    
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const adminToken = localStorage.getItem('adminToken');
      const userToken = localStorage.getItem('userToken');
      
      // Only redirect if user was actually authenticated (session expired)
      // Don't redirect on login failures (wrong PIN, wrong credentials)
      if (adminToken || userToken) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('userToken');

        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin';
        } else {
          window.location.href = '/';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;