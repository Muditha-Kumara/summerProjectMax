import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

export const RoomCard = ({ room }) => {
  const [targetTemp, setTargetTemp] = useState(room.targetTemp || 21);

  const handleTempChange = async (e) => {
    const newTemp = parseInt(e.target.value);
    setTargetTemp(newTemp);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/rooms/${room.id}/temp`, { temperature: newTemp }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to update temperature:', err);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-3xl font-bold text-gray-900 mb-4">{room.name}</h3>
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-xl text-gray-600">Current</p>
          <p className="text-6xl font-bold text-gray-900">{room.currentTemp}°</p>
        </div>
        <div className="text-right">
          <p className="text-xl text-gray-600">Target</p>
          <p className="text-4xl font-bold text-blue-600">{targetTemp}°</p>
        </div>
      </div>
      <input
        type="range"
        min="15"
        max="30"
        value={targetTemp}
        onChange={handleTempChange}
        className="w-full h-4 bg-gray-300 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((targetTemp - 15) / 15) * 100}%, #d1d5db ${((targetTemp - 15) / 15) * 100}%, #d1d5db 100%)`
        }}
      />
      <div className="flex justify-between text-xl text-gray-600 mt-2">
        <span>15°</span>
        <span>30°</span>
      </div>
    </div>
  );
};

export const QuickModes = ({ onSelect }) => {
  const { t } = useTranslation();

  const modes = [
    { key: 'home', label: t('modes.home'), icon: '🏠' },
    { key: 'away', label: t('modes.away'), icon: '🚶' },
    { key: 'eco', label: t('modes.eco'), icon: '🌱' },
    { key: 'comfort', label: t('modes.comfort'), icon: '✨' }
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {modes.map((mode) => (
        <button
          key={mode.key}
          onClick={() => onSelect(mode.label)}
          className="min-h-[120px] w-full rounded-2xl bg-blue-600 text-white text-xl font-semibold hover:bg-blue-700 active:bg-blue-800 flex flex-col items-center justify-center gap-2"
        >
          <span className="text-4xl">{mode.icon}</span>
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
};

export const TemporaryLeave = ({ onConfirm }) => {
  const { t } = useTranslation();
  const hours = [1, 2, 3];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-3xl font-bold text-gray-900 mb-6">{t('leave.title')}</h3>
      <div className="grid grid-cols-3 gap-4">
        {hours.map((hour) => (
          <button
            key={hour}
            onClick={() => onConfirm(hour)}
            className="min-h-[80px] w-full rounded-2xl bg-orange-500 text-white text-xl font-semibold hover:bg-orange-600 active:bg-orange-700"
          >
            {hour} {t('leave.hours')}
          </button>
        ))}
      </div>
    </div>
  );
};