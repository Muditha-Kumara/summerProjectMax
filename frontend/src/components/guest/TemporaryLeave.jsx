import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const TemporaryLeave = ({ onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [selectedHours, setSelectedHours] = useState(2);

  const durations = [1, 2, 3, 4, 5, 6];

  const handleConfirm = () => {
    onConfirm(selectedHours);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md space-y-5 max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center">
            🚶 {t('actions.temporaryLeave')}
          </h2>
          
          <p className="text-lg sm:text-xl text-gray-600 text-center">
            {t('actions.temporaryLeaveDesc')}
          </p>

          {/* Duration Selection */}
          <div className="grid grid-cols-2 gap-3">
            {durations.map((hours) => (
              <button
                key={hours}
                onClick={() => setSelectedHours(hours)}
                className={`py-5 rounded-2xl text-xl sm:text-2xl font-bold transition-all min-h-[80px] ${
                  selectedHours === hours
                    ? 'bg-orange-500 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
                }`}
              >
                {hours} {t('actions.hours')}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-5 rounded-2xl text-lg sm:text-xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all min-h-[70px]"
            >
              {t('actions.cancel', 'Peruuta')}
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-5 rounded-2xl text-lg sm:text-xl font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all min-h-[70px] shadow-lg"
            >
              {t('actions.confirm', 'Vahvista')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TemporaryLeave;
