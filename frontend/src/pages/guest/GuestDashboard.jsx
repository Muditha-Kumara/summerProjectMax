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

  const handleQuickMode = async (mode) => {
    try {
      const response = await api.post(`/optimization/quick-mode/${mode}`);
      if (response.data.success) {
        toast.success(t('alerts.modeChanged'));
        fetchRooms();
      }
    } catch (error) {
      toast.error(t('alerts.error'));
    }
  };

  const handleTemporaryLeave = async (hours) => {
    try {
      for (const room of rooms) {
        await api.post(`/optimization/temporary-leave/${room.id}`, { durationHours: hours });
      }
      toast.success(t('alerts.leaveActivated'));
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
        <div className="text-3xl text-gray-600 animate-pulse font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-32"
    >
      {/* Top Bar with Logout */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base text-gray-500">{t('greeting.welcome', 'Tervetuloa')}</p>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">🏠 {t('app.title', 'Älykäs Lämmitys')}</h1>
        </div>
        <motion.button
          onClick={handleLogout}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-red-300
                     text-red-600 font-bold rounded-2xl shadow-sm
                     hover:bg-red-50 hover:border-red-400 active:scale-95 transition-all min-h-[60px]"
        >
          <span className="text-2xl">🚪</span>
          <span className="text-base sm:text-lg">{t('actions.logout', 'Kirjaudu ulos')}</span>
        </motion.button>
      </div>

      {/* Outdoor Weather Banner */}
      {outdoorTemp !== null && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-3xl p-5 sm:p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base sm:text-lg opacity-90 font-medium">{t('dashboard.outdoorTemp')}</p>
              <p className="text-4xl sm:text-5xl font-bold">{Math.round(outdoorTemp)}°C</p>
            </div>
            {weather && (
              <div className="text-right">
                <p className="text-5xl sm:text-6xl">
                  {weather.icon?.includes('01') ? '☀️' : 
                   weather.icon?.includes('02') ? '⛅' :
                   weather.icon?.includes('03') ? '☁️' :
                   weather.icon?.includes('09') || weather.icon?.includes('10') ? '🌧️' :
                   weather.icon?.includes('13') ? '❄️' : '🌡️'}
                </p>
                <p className="text-base sm:text-lg capitalize mt-2 font-medium">{weather.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Modes */}
      <QuickModes onModeChange={handleQuickMode} />

      {/* Temporary Leave Button */}
      <button
        onClick={() => setShowLeaveModal(true)}
        className="w-full bg-orange-500 text-white text-xl sm:text-2xl font-bold py-5 sm:py-6 rounded-2xl 
                   shadow-lg hover:bg-orange-600 active:scale-[0.98] transition-all
                   flex items-center justify-center gap-3 min-h-[80px]"
      >
        <span className="text-3xl sm:text-4xl">🚶</span>
        {t('actions.temporaryLeave')}
      </button>

      {/* Room Cards */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 px-1">{t('dashboard.title')}</h2>
        <div className="space-y-4">
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

