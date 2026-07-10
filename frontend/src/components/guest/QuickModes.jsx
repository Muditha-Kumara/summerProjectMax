import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const QuickModes = ({ onModeChange }) => {
  const { t } = useTranslation();
  const [activeMode, setActiveMode] = useState('home');

  const modes = [
    { id: 'home', icon: '🏠', label: t('modes.home') },
    { id: 'away', icon: '🚗', label: t('modes.away') },
    { id: 'eco', icon: '🌿', label: t('modes.eco') },
    { id: 'comfort', icon: '😌', label: t('modes.comfort') }
  ];

  const handleModeClick = (modeId) => {
    setActiveMode(modeId);
    onModeChange(modeId);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 px-2">{t('modes.title', 'Pikatilat')}</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {modes.map((mode) => (
          <motion.button
            key={mode.id}
            onClick={() => handleModeClick(mode.id)}
            className={`mode-btn ${activeMode === mode.id ? 'active' : ''} min-h-[100px]`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-pressed={activeMode === mode.id}
          >
            <span className="text-5xl sm:text-6xl">{mode.icon}</span>
            <span className="text-lg sm:text-xl font-bold">{mode.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default QuickModes;
