import api from './api';

export const roomService = {
  getAll: async () => {
    const response = await api.get('/rooms');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  },

  updateTemperature: async (id, targetTemp) => {
    const response = await api.put(`/rooms/${id}/temperature`, { targetTemp });
    return response.data;
  },

  updateControlMode: async (id, controlMode) => {
    const response = await api.put(`/rooms/${id}/control-mode`, { controlMode });
    return response.data;
  },

  getHistoricalData: async (id, params = {}) => {
    const response = await api.get(`/rooms/${id}/history`, { params });
    return response.data;
  },

  getEnergyConsumption: async (id, period = 'day') => {
    const response = await api.get(`/rooms/${id}/energy`, { params: { period } });
    return response.data;
  },

  create: async (roomData) => {
    const response = await api.post('/rooms', roomData);
    return response.data;
  },

  update: async (id, roomData) => {
    const response = await api.put(`/rooms/${id}`, roomData);
    return response.data;
  },

  toggleRelay: async (id, state) => {
    const response = await api.post(`/rooms/${id}/relay`, { state });
    return response.data;
  },

  updateAlertThreshold: async (id, alertThreshold) => {
    const response = await api.put(`/rooms/${id}/alert-threshold`, { alertThreshold });
    return response.data;
  }
};

export default roomService;
