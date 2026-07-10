import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import useRoomStore from '../../contexts/roomStore';
import RoomCard from '../../components/guest/RoomCard';
import QuickModes from '../../components/guest/QuickModes';
import TemporaryLeave from '../../components/guest/TemporaryLeave';
import VoiceAssistant from '../../components/guest/VoiceAssistant';
import authService from '../../services/authService';
import api from '../../services/api';
import { toast } from 'react-toastify';

const GuestDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { rooms, outdoorTemp, weather, loading, fetchRooms } = useRoomStore();
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  useEffect(() => {
    fetchRooms();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRooms, 30000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  // Map OpenWeather descriptions to translation keys
  const getWeatherTranslationKey = (description) => {
    if (!description) return 'clear';
    const desc = description.toLowerCase();
    if (desc.includes('clear') || desc.includes('sunny')) return 'clear';
    if (desc.includes('cloud') || desc.includes('overcast')) return 'clouds';
    if (desc.includes('rain') || desc.includes('drizzle') || desc.includes('shower')) return 'rain';
    if (desc.includes('snow') || desc.includes('sleet')) return 'snow';
    if (desc.includes('wind') || desc.includes('breeze')) return 'wind';
    return 'clear';
  };

  const handleQuickMode = async (mode) => {
    try {
      const response = await api.post(`/optimization/quick-mode/${mode}`);
      if (response.data.success) {
        fetchRooms();
      }
    } catch (error) {
      toast.error(t('alerts.error'));
    }
  };

  const handleTemporaryLeave = async (leaveData) => {
    try {
      for (const room of rooms) {
        await api.post(`/optimization/temporary-leave/${room.id}`, {
          date: leaveData.date,
          departureTime: leaveData.departureTime,
          returnTime: leaveData.returnTime,
          durationHours: leaveData.durationHours
        });
      }
      setShowLeaveModal(false);
      fetchRooms();
    } catch (error) {
      toast.error(t('alerts.error'));
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/', { replace: true });
  };

  if (loading && rooms.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-3xl text-gray-600 animate-pulse font-semibold">{t('dashboard.loading')}</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 sm:space-y-10 pb-32"
    >
      {/* Top Bar with Logout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-lg sm:text-xl text-gray-500 font-medium">{t('greeting.welcome')}</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 truncate">🏠 {t('app.title')}</h1>
        </div>
        <motion.button
          onClick={handleLogout}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-3 px-6 py-4 bg-white border-4 border-red-300
                     text-red-600 font-bold rounded-2xl shadow-md
                     hover:bg-red-50 hover:border-red-400 active:scale-95 transition-all min-h-[80px] text-lg sm:text-xl"
        >
          <span className="text-3xl sm:text-4xl">🚪</span>
          <span>{t('actions.logout')}</span>
        </motion.button>
      </div>

      {/* Outdoor Weather Banner */}
      {outdoorTemp !== null && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-3xl p-6 sm:p-8 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xl sm:text-2xl opacity-90 font-medium mb-2">{t('dashboard.outdoorTemp')}</p>
              <p className="text-5xl sm:text-6xl lg:text-7xl font-bold">{Math.round(outdoorTemp)}°C</p>
            </div>
            {weather && (
              <div className="text-right">
                <p className="text-6xl sm:text-7xl lg:text-8xl">
                  {weather.icon?.includes('01') ? '☀️' : 
                   weather.icon?.includes('02') ? '⛅' :
                   weather.icon?.includes('03') ? '☁️' :
                   weather.icon?.includes('09') || weather.icon?.includes('10') ? '🌧️' :
                   weather.icon?.includes('13') ? '❄️' : '🌡️'}
                </p>
                <p className="text-xl sm:text-2xl capitalize mt-3 font-medium">{t(`weather.${getWeatherTranslationKey(weather.description)}`)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Modes */}
      <QuickModes onModeChange={handleQuickMode} onAwayClick={() => setShowLeaveModal(true)} />

      {/* Room Cards */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 px-1">{t('dashboard.title')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </div>

      {/* Temporary Leave Modal */}
      {showLeaveModal && (
        <TemporaryLeave 
          onClose={() => setShowLeaveModal(false)}
          onConfirm={handleTemporaryLeave}
        />
      )}

      {/* Voice Assistant */}
      <VoiceAssistant />
    </motion.div>
  );
};

export default GuestDashboard;

