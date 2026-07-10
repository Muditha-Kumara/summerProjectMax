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
    if (!result.success) {
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
      className={`bg-white p-4 sm:p-6 rounded-3xl shadow-md border-2 ${room.is_critical ? 'border-red-400 bg-red-50' : 'border-gray-200'} space-y-4`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Room Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-4xl sm:text-5xl flex-shrink-0">{getRoomIcon(room.name)}</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 break-words leading-tight">
              {t(`rooms.${room.name}`, room.name)}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 capitalize break-words">
              {room.control_mode}
            </p>
          </div>
        </div>
        {room.is_critical && (
          <span className="bg-red-200 text-red-800 text-sm font-bold px-3 py-2 rounded-full flex-shrink-0">
            ⚠️
          </span>
        )}
      </div>

      {/* Temperature Display - Stacked for mobile */}
      <div className="flex items-center justify-around bg-gradient-to-r from-blue-50 to-orange-50 rounded-2xl p-4">
        <div className="text-center">
          <p className="text-sm sm:text-base text-gray-600 font-semibold mb-1">{t('dashboard.currentTemp')}</p>
          <p className={`text-3xl sm:text-4xl font-bold ${getTempColor(room.current_temp || 0)}`}>
            {room.current_temp ? Math.round(room.current_temp) : '--'}
            <span className="text-lg sm:text-xl">°C</span>
          </p>
        </div>
        <div className="w-px h-12 bg-gray-300"></div>
        <div className="text-center">
          <p className="text-sm sm:text-base text-gray-600 font-semibold mb-1">{t('dashboard.targetTemp')}</p>
          <p className="text-3xl sm:text-4xl font-bold text-orange-600">
            {Math.round(localTarget)}<span className="text-lg sm:text-xl">°C</span>
          </p>
        </div>
      </div>

      {/* Temperature Slider with +/- Buttons */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Minus Button */}
          <button
            onClick={() => {
              const newTemp = Math.max(room.min_temp || 5, localTarget - 1);
              handleTempChange(newTemp);
              handleTempCommit();
            }}
            className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-blue-100 hover:bg-blue-200 
                       active:bg-blue-300 text-4xl sm:text-5xl font-bold text-blue-700 rounded-full shadow-md 
                       transition-all flex-shrink-0 border-4 border-blue-300"
            aria-label="Decrease temperature"
            disabled={localTarget <= (room.min_temp || 5)}
          >
            −
          </button>

          {/* Slider */}
          <div className="flex-1 flex flex-col items-center">
            <input
              type="range"
              min={room.min_temp || 5}
              max={room.max_temp || 30}
              step={1}
              value={localTarget}
              onChange={(e) => handleTempChange(parseFloat(e.target.value))}
              onMouseUp={handleTempCommit}
              onTouchEnd={handleTempCommit}
              className="w-full h-3 sm:h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer 
                         accent-orange-500 slider-large-thumb"
              aria-label={t('actions.adjustTemp')}
            />
            <div className="flex justify-between w-full text-sm sm:text-base text-gray-600 font-bold mt-2">
              <span>{Math.round(room.min_temp || 5)}°C</span>
              <span>{Math.round(room.max_temp || 30)}°C</span>
            </div>
          </div>

          {/* Plus Button */}
          <button
            onClick={() => {
              const newTemp = Math.min(room.max_temp || 30, localTarget + 1);
              handleTempChange(newTemp);
              handleTempCommit();
            }}
            className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-orange-100 hover:bg-orange-200 
                       active:bg-orange-300 text-4xl sm:text-5xl font-bold text-orange-700 rounded-full shadow-md 
                       transition-all flex-shrink-0 border-4 border-orange-300"
            aria-label="Increase temperature"
            disabled={localTarget >= (room.max_temp || 30)}
          >
            +
          </button>
        </div>
      </div>

      {/* Humidity */}
      {room.humidity && (
        <div className="pt-3 border-t-2 border-gray-200 flex items-center justify-center gap-3">
          <span className="text-2xl">💧</span>
          <span className="text-lg sm:text-xl text-gray-700 font-semibold">{t('dashboard.humidity')}: {room.humidity}%</span>
        </div>
      )}
    </motion.div>
  );
};

export default RoomCard;