import api from './api';

export const authService = {
  // Admin login
  loginAdmin: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success && response.data.token) {
      localStorage.setItem('adminToken', response.data.token);
    }
    return response.data;
  },

  // User PIN login
  loginUser: async (pin) => {
    const response = await api.post('/auth/login/pin', { pin });
    if (response.data.success && response.data.token) {
      localStorage.setItem('userToken', response.data.token);
    }
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userToken');
  },

  // Check if admin is authenticated
  isAdminAuthenticated: () => {
    return !!localStorage.getItem('adminToken');
  },

  // Check if user is authenticated
  isUserAuthenticated: () => {
    return !!localStorage.getItem('userToken');
  },

  // Get current admin user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

export default authService;
