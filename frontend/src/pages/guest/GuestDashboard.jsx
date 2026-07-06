import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import useRoomStore from '../../contexts/roomStore';
import RoomCard from '../../components/guest/RoomCard';
import QuickModes from '../../components/guest/QuickModes';
import TemporaryLeave from '../../components/guest/TemporaryLeave';
import VoiceAssistant from '../../components/guest/VoiceAssistant';
import api from '../../services/api';
import { toast } from 'react-toastify';

const GuestDashboard = () => {
  const { t } = useTranslation();
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
      // Apply to all rooms
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

  if (loading && rooms.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-2xl text-gray-500 animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-32"
    >
      {/* Outdoor Weather Banner */}
      {outdoorTemp !== null && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg opacity-90">{t('dashboard.outdoorTemp')}</p>
              <p className="text-5xl font-bold">{Math.round(outdoorTemp)}°C</p>
            </div>
            {weather && (
              <div className="text-right">
                <p className="text-6xl">
                  {weather.icon?.includes('01') ? '☀️' : 
                   weather.icon?.includes('02') ? '⛅' :
                   weather.icon?.includes('03') ? '☁️' :
                   weather.icon?.includes('09') || weather.icon?.includes('10') ? '🌧️' :
                   weather.icon?.includes('13') ? '❄️' : '🌡️'}
                </p>
                <p className="text-lg capitalize mt-2">{weather.description}</p>
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
        className="w-full bg-warm-500 text-white text-2xl font-bold py-6 rounded-2xl 
                   shadow-lg hover:bg-warm-600 active:scale-[0.98] transition-all
                   flex items-center justify-center gap-3"
      >
        <span className="text-3xl">🚶</span>
        {t('actions.temporaryLeave')}
      </button>

      {/* Room Cards */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('dashboard.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
