import api from './api';

export const authService = {
  // Admin login
  loginAdmin: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success && response.data.token) {
        localStorage.setItem('adminToken', response.data.token);
      }
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please try again.'
      };
    }
  },

  // User PIN login
  loginUser: async (pin) => {
    try {
      const response = await api.post('/auth/login/pin', { pin });
      if (response.data.success && response.data.token) {
        localStorage.setItem('userToken', response.data.token);
      }
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please try again.'
      };
    }
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
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get user'
      };
    }
  }
};

export default authService;