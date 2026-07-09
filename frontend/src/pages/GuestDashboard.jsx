import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { RoomCard, QuickModes, TemporaryLeave } from '../components/GuestComponents';
import VoiceAssistant from '../components/VoiceAssistant';

const GuestDashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [currentMode, setCurrentMode] = useState('Home');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/rooms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(response.data);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const handleModeSelect = (mode) => {
    setCurrentMode(mode);
  };

  const handleTemporaryLeave = (hours) => {
    console.log(`Setting temporary leave for ${hours} hours`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => changeLanguage('fi')}
              className="min-h-[60px] px-6 rounded-2xl bg-gray-200 text-xl font-semibold hover:bg-gray-300"
            >
              🇫🇮 FI
            </button>
            <button
              onClick={() => changeLanguage('sv')}
              className="min-h-[60px] px-6 rounded-2xl bg-gray-200 text-xl font-semibold hover:bg-gray-300"
            >
              🇸🇪 SV
            </button>
            <button
              onClick={() => changeLanguage('en')}
              className="min-h-[60px] px-6 rounded-2xl bg-gray-200 text-xl font-semibold hover:bg-gray-300"
            >
              🇬🇧 EN
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="min-h-[60px] px-6 rounded-2xl bg-red-600 text-white text-xl font-semibold hover:bg-red-700"
          >
            Logout
          </button>
        </div>
        
        <div className="text-center">
          <p className="text-2xl text-gray-600 mb-2">{t('dashboard.current_mode')}</p>
          <h2 className="text-4xl font-bold text-gray-900">{currentMode}</h2>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Rooms */}
        <div className="space-y-4">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>

        {/* Quick Modes */}
        <QuickModes onSelect={handleModeSelect} />

        {/* Temporary Leave */}
        <TemporaryLeave onConfirm={handleTemporaryLeave} />
      </div>

      {/* Voice Assistant */}
      <VoiceAssistant rooms={rooms} />
    </div>
  );
};

export default GuestDashboard;