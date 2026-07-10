import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import useRoomStore from '../../contexts/roomStore';
import { toast } from 'react-toastify';

const RoomCard = ({ room }) => {
  const { t } = useTranslation();
  const { updateRoomTemp } = useRoomStore();
  const [localTarget, setLocalTarget] = useState(Math.round(room.target_temp));

  const handleTempChange = async (newTemp) => {
    setLocalTarget(newTemp);
  };

  const handleTempCommit = async () => {
    const result = await updateRoomTemp(room.id, localTarget);
    if (result.success) {
      toast.success(t('alerts.tempUpdated'));
    } else {
      toast.error(result.message || t('alerts.error'));
      setLocalTarget(Math.round(room.target_temp));
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
      className={`bg-white p-6 rounded-3xl shadow-md border border-gray-100 space-y-5 ${room.is_critical ? 'border-red-300' : ''}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Room Header */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-4xl flex-shrink-0">{getRoomIcon(room.name)}</span>
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-gray-900 break-words leading-tight">
              {t(`rooms.${room.name}`, room.name)}
            </h3>
            <p className="text-base text-gray-600 capitalize break-words">
              {room.control_mode}
            </p>
          </div>
        </div>
        {room.is_critical && (
          <span className="bg-red-100 text-red-700 text-base font-bold px-3 py-1 rounded-full flex-shrink-0">
            ⚠️
          </span>
        )}
      </div>

      {/* Temperature Display */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-base text-gray-600 font-medium">{t('dashboard.currentTemp')}</p>
          <p className={`text-4xl font-bold ${getTempColor(room.current_temp || 0)}`}>
            {room.current_temp ? Math.round(room.current_temp) : '--'}
            <span className="text-2xl">°C</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-base text-gray-600 font-medium">{t('dashboard.targetTemp')}</p>
          <p className="text-4xl font-bold text-primary-600">
            {Math.round(localTarget)}°C
          </p>
        </div>
      </div>

      {/* Temperature Slider with +/- Buttons */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {/* Minus Button */}
          <button
            onClick={() => {
              const newTemp = Math.max(room.min_temp || 5, localTarget - 1);
              handleTempChange(newTemp);
              handleTempCommit();
            }}
            className="w-14 h-14 flex items-center justify-center bg-gray-100 hover:bg-gray-200 
                       active:bg-gray-300 text-3xl font-bold text-gray-700 rounded-full shadow-sm 
                       transition-all flex-shrink-0"
            aria-label="Decrease temperature"
            disabled={localTarget <= (room.min_temp || 5)}
          >
            −
          </button>

          {/* Slider */}
          <input
            type="range"
            min={room.min_temp || 5}
            max={room.max_temp || 30}
            step={1}
            value={localTarget}
            onChange={(e) => handleTempChange(parseFloat(e.target.value))}
            onMouseUp={handleTempCommit}
            onTouchEnd={handleTempCommit}
            className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer 
                       accent-orange-500"
            aria-label={t('actions.adjustTemp')}
          />

          {/* Plus Button */}
          <button
            onClick={() => {
              const newTemp = Math.min(room.max_temp || 30, localTarget + 1);
              handleTempChange(newTemp);
              handleTempCommit();
            }}
            className="w-14 h-14 flex items-center justify-center bg-orange-100 hover:bg-orange-200 
                       active:bg-orange-300 text-3xl font-bold text-orange-700 rounded-full shadow-sm 
                       transition-all flex-shrink-0"
            aria-label="Increase temperature"
            disabled={localTarget >= (room.max_temp || 30)}
          >
            +
          </button>
        </div>
        <div className="flex justify-between text-base text-gray-500 font-medium">
          <span>{room.min_temp || 5}°C</span>
          <span>{room.max_temp || 30}°C</span>
        </div>
      </div>

      {/* Humidity */}
      {room.humidity && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-3">
          <span className="text-2xl">💧</span>
          <span className="text-xl text-gray-700 font-medium">{room.humidity}%</span>
        </div>
      )}
    </motion.div>
  );
};

export default RoomCard;