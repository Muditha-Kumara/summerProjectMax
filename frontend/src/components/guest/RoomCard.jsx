import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import useRoomStore from '../../contexts/roomStore';
import { toast } from 'react-toastify';

const RoomCard = ({ room }) => {
  const { t } = useTranslation();
  const { updateRoomTemp } = useRoomStore();
  const [localTarget, setLocalTarget] = useState(room.target_temp);

  const handleTempChange = async (newTemp) => {
    setLocalTarget(newTemp);
  };

  const handleTempCommit = async () => {
    const result = await updateRoomTemp(room.id, localTarget);
    if (result.success) {
      toast.success(t('alerts.tempUpdated'));
    } else {
      toast.error(result.message || t('alerts.error'));
      setLocalTarget(room.target_temp);
    }
  };

  const getTempColor = (temp) => {
    if (temp < 15) return 'text-blue-600';
    if (temp < 20) return 'text-blue-400';
    if (temp < 24) return 'text-green-500';
    return 'text-red-500';
  };

  const getRoomIcon = (name) => {
    const icons = {
      'Kodinhoitohuone': '🧺',
      'Eteinen': '🚪',
      'Makuuhuone': '🛏️',
      'Olohuone': '🛋️',
      'Varasto': '📦',
      'Lämminvesivaraaja': '🚿',
      'Ilmalämpöpumppu': '❄️'
    };
    return icons[name] || '🌡️';
  };

  return (
    <motion.div 
      className={`room-card ${room.is_critical ? 'critical' : ''}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Room Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{getRoomIcon(room.name)}</span>
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              {t(`rooms.${room.name}`, room.name)}
            </h3>
            <p className="text-sm text-gray-500 capitalize">
              {room.control_mode}
            </p>
          </div>
        </div>
        {room.is_critical && (
          <span className="bg-red-100 text-red-700 text-sm font-bold px-3 py-1 rounded-full">
            ⚠️
          </span>
        )}
      </div>

      {/* Temperature Display */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">{t('dashboard.currentTemp')}</p>
          <p className={`temp-display ${getTempColor(room.current_temp || 0)}`}>
            {room.current_temp ? Math.round(room.current_temp * 10) / 10 : '--'}
            <span className="temp-unit">°C</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">{t('dashboard.targetTemp')}</p>
          <p className="text-3xl font-bold text-primary-600">
            {localTarget}°C
          </p>
        </div>
      </div>

      {/* Temperature Slider */}
      <div className="space-y-2">
        <input
          type="range"
          min={room.min_temp || 5}
          max={room.max_temp || 30}
          step={0.5}
          value={localTarget}
          onChange={(e) => handleTempChange(parseFloat(e.target.value))}
          onMouseUp={handleTempCommit}
          onTouchEnd={handleTempCommit}
          className="temp-slider"
          aria-label={t('actions.adjustTemp')}
        />
        <div className="flex justify-between text-sm text-gray-400">
          <span>{room.min_temp || 5}°C</span>
          <span>{room.max_temp || 30}°C</span>
        </div>
      </div>

      {/* Humidity */}
      {room.humidity && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
          <span className="text-xl">💧</span>
          <span className="text-lg text-gray-600">{room.humidity}%</span>
        </div>
      )}
    </motion.div>
  );
};

export default RoomCard;
