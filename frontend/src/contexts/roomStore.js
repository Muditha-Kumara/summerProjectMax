import { create } from 'zustand';
import roomService from '../services/roomService';

const useRoomStore = create((set, get) => ({
  rooms: [],
  outdoorTemp: null,
  weather: null,
  loading: false,
  error: null,
  activeMode: 'home',

  fetchRooms: async () => {
    set({ loading: true, error: null });
    try {
      const data = await roomService.getAll();
      if (data.success) {
        set({ 
          rooms: data.rooms, 
          outdoorTemp: data.outdoorTemp,
          weather: data.weather,
          loading: false 
        });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  updateRoomTemp: async (roomId, targetTemp) => {
    try {
      const data = await roomService.updateTemperature(roomId, targetTemp);
      if (data.success) {
        set((state) => ({
          rooms: state.rooms.map((room) =>
            room.id === roomId ? { ...room, target_temp: targetTemp } : room
          ),
        }));
      }
      return data;
    } catch (error) {
      set({ error: error.message });
      return { success: false, message: error.message };
    }
  },

  setActiveMode: (mode) => set({ activeMode: mode }),

  getRoomById: (id) => get().rooms.find((room) => room.id === id),
}));

export default useRoomStore;
