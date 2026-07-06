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
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-3xl p-8 w-full max-w-md space-y-6"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-3xl font-bold text-gray-800 text-center">
            🚶 {t('actions.temporaryLeave')}
          </h2>
          
          <p className="text-xl text-gray-600 text-center">
            {t('actions.temporaryLeaveDesc')}
          </p>

          {/* Duration Selection */}
          <div className="grid grid-cols-3 gap-3">
            {durations.map((hours) => (
              <button
                key={hours}
                onClick={() => setSelectedHours(hours)}
                className={`py-4 rounded-2xl text-2xl font-bold transition-all ${
                  selectedHours === hours
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {hours} {t('actions.hours')}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl text-xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-4 rounded-2xl text-xl font-bold bg-warm-500 text-white hover:bg-warm-600 transition-all"
            >
              OK
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TemporaryLeave;
