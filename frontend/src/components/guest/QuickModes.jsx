import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const QuickModes = ({ onModeChange, onAwayClick, currentMode }) => {
  const { t } = useTranslation();
  const [activeMode, setActiveMode] = useState(currentMode || 'home');

  // Sync with external mode changes (e.g., from voice assistant)
  useEffect(() => {
    if (currentMode) {
      setActiveMode(currentMode);
    }
  }, [currentMode]);

  const modes = [
    { id: 'home', icon: '🏠', label: t('modes.home') },
    { id: 'away', icon: '🚗', label: t('modes.away') },
    { id: 'eco', icon: '🌿', label: t('modes.eco') },
    { id: 'comfort', icon: '😌', label: t('modes.comfort') }
  ];

  const handleModeClick = (modeId) => {
    if (modeId === 'away') {
      // Open the away modal instead of immediately changing mode
      onAwayClick();
      return;
    }
    setActiveMode(modeId);
    onModeChange(modeId);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 px-2">{t('modes.title')}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {modes.map((mode) => (
          <motion.button
            key={mode.id}
            onClick={() => handleModeClick(mode.id)}
            className={`mode-btn ${activeMode === mode.id ? 'active' : ''} min-h-[120px] sm:min-h-[140px]`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-pressed={activeMode === mode.id}
          >
            <span className="text-6xl sm:text-7xl">{mode.icon}</span>
            <span className="text-xl sm:text-2xl font-bold">{mode.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default QuickModes;
