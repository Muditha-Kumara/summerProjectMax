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
    <div className="grid grid-cols-4 gap-3">
      {modes.map((mode) => (
        <motion.button
          key={mode.id}
          onClick={() => handleModeClick(mode.id)}
          className={`mode-btn ${activeMode === mode.id ? 'active' : ''}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-pressed={activeMode === mode.id}
        >
          <span className="text-4xl">{mode.icon}</span>
          <span className="text-base font-semibold">{mode.label}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default QuickModes;
