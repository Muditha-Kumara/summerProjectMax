import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const TemporaryLeave = ({ onClose, onConfirm }) => {
  const { t } = useTranslation();
  
  // Get booking dates from backend
  const [bookingData, setBookingData] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [quickDuration, setQuickDuration] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        // Try to fetch from backend first
        const token = localStorage.getItem('userToken') || localStorage.getItem('token');
        if (token) {
          const response = await api.get('/bookings/current', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.success && response.data.booking) {
            setBookingData(response.data.booking);
          }
        }
      } catch (error) {
        // Fallback to localStorage if API fails
        const stored = localStorage.getItem('bookingData');
        if (stored) {
          const data = JSON.parse(stored);
          setBookingData(data);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
    
    // Set default date to today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setSelectedDate(todayStr);
    
    // Set default times
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMin = now.getMinutes().toString().padStart(2, '0');
    setDepartureTime(`${currentHour}:${currentMin}`);
    
    // Default return time: 2 hours later
    const returnHour = (now.getHours() + 2) % 24;
    setReturnTime(`${returnHour.toString().padStart(2, '0')}:${currentMin}`);
  }, []);

  const quickDurations = [
    { hours: 1, label: '1h' },
    { hours: 2, label: '2h' },
    { hours: 3, label: '3h' },
    { hours: 4, label: '4h' }
  ];

  const handleQuickDuration = (hours) => {
    setQuickDuration(hours);
    setValidationError('');
    
    // Calculate return time based on departure time + hours
    if (departureTime) {
      const [depHour, depMin] = departureTime.split(':').map(Number);
      const returnHour = (depHour + hours) % 24;
      setReturnTime(`${returnHour.toString().padStart(2, '0')}:${depMin.toString().padStart(2, '0')}`);
    }
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setQuickDuration(null);
    setValidationError('');
  };

  const handleDepartureTimeChange = (e) => {
    const newDepartureTime = e.target.value;
    setDepartureTime(newDepartureTime);
    setQuickDuration(null);
    setValidationError('');
    
    // Auto-set minimum return time (30 minutes later)
    if (newDepartureTime) {
      const [depHour, depMin] = newDepartureTime.split(':').map(Number);
      let returnHour = depHour;
      let returnMin = depMin + 30;
      
      // Handle overflow
      if (returnMin >= 60) {
        returnMin -= 60;
        returnHour = (returnHour + 1) % 24;
      }
      
      setReturnTime(`${returnHour.toString().padStart(2, '0')}:${returnMin.toString().padStart(2, '0')}`);
    }
  };

  const handleReturnTimeChange = (e) => {
    const newReturnTime = e.target.value;
    setReturnTime(newReturnTime);
    setQuickDuration(null);
    setValidationError('');
    
    // Validate minimum 30 minutes duration
    if (departureTime && newReturnTime) {
      const [depHour, depMin] = departureTime.split(':').map(Number);
      const [retHour, retMin] = newReturnTime.split(':').map(Number);
      
      let durationMinutes = (retHour * 60 + retMin) - (depHour * 60 + depMin);
      if (durationMinutes < 0) {
        durationMinutes += 24 * 60; // Handle overnight
      }
      
      if (durationMinutes < 30) {
        setValidationError(t('actions.minDurationError', 'Minimum duration is 30 minutes'));
      }
    }
  };

  const handleConfirm = () => {
    // Validate minimum 30 minutes duration
    const [depHour, depMin] = departureTime.split(':').map(Number);
    const [retHour, retMin] = returnTime.split(':').map(Number);
    
    let durationMinutes = (retHour * 60 + retMin) - (depHour * 60 + depMin);
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60; // Handle overnight
    }
    
    if (durationMinutes < 30) {
      setValidationError(t('actions.minDurationError', 'Minimum duration is 30 minutes'));
      return;
    }
    
    const durationHours = durationMinutes / 60;
    
    onConfirm({
      date: selectedDate,
      departureTime,
      returnTime,
      durationHours
    });
  };

  // Get min and max dates from booking
  // Min date should be today (current date), not check-in date
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  const maxDate = bookingData?.checkOut ? new Date(bookingData.checkOut).toISOString().split('T')[0] : '';
  
  // Check if selected date is today
  const isToday = selectedDate === minDate;

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
          className="bg-white rounded-3xl p-8 sm:p-10 w-full max-w-3xl space-y-8 max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-800 text-center">
            🚗 {t('actions.away')}
          </h2>
          
          <p className="text-2xl sm:text-3xl text-gray-600 text-center font-medium">
            {t('actions.awayDesc')}
          </p>

          {/* Helper Text */}
          <div className="bg-blue-50 border-4 border-blue-200 rounded-3xl p-6">
            <p className="text-xl sm:text-2xl text-blue-800 text-center font-medium">
              💡 {t('actions.helperText', 'Select how long you will be away. Minimum 30 minutes.')}
            </p>
          </div>

          {/* Quick Duration Selection - Primary Action */}
          <div className="space-y-4">
            <label className="text-2xl sm:text-3xl font-bold text-gray-700 block text-center">
              {t('actions.quickDuration')}
            </label>
            <div className="grid grid-cols-2 gap-4">
              {quickDurations.map(({ hours, label }) => (
                <button
                  key={hours}
                  onClick={() => handleQuickDuration(hours)}
                  className={`py-8 rounded-3xl text-3xl sm:text-4xl font-bold transition-all min-h-[120px] border-4 ${
                    quickDuration === hours
                      ? 'bg-orange-500 text-white shadow-2xl scale-105 border-orange-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-4">
            <label className="text-2xl sm:text-3xl font-bold text-gray-700 block">
              📅 {t('actions.date')}
            </label>
            <p className="text-lg sm:text-xl text-gray-600 text-center">
              {t('actions.dateHelper', 'Choose the day you will be away')}
            </p>
            <input
              type="date"
              value={selectedDate}
              min={minDate}
              max={maxDate}
              onChange={handleDateChange}
              className="w-full px-8 py-6 text-3xl sm:text-4xl font-bold border-4 border-orange-300 rounded-3xl focus:border-orange-500 focus:outline-none bg-orange-50"
            />
            {isToday && (
              <p className="text-xl sm:text-2xl text-orange-600 text-center font-bold">
                ✓ {t('actions.today', 'Today')}
              </p>
            )}
          </div>

          {/* Time Selection - Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <label className="text-xl sm:text-2xl font-bold text-gray-700 block text-center">
                🕐 {t('actions.departureTime')}
              </label>
              <p className="text-base sm:text-lg text-gray-600 text-center">
                {t('actions.departureHelper', 'When you leave')}
              </p>
              <input
                type="time"
                value={departureTime}
                onChange={handleDepartureTimeChange}
                className="w-full px-6 py-6 text-2xl sm:text-3xl font-bold border-4 border-blue-300 rounded-3xl focus:border-blue-500 focus:outline-none bg-blue-50"
              />
            </div>

            <div className="space-y-4">
              <label className="text-xl sm:text-2xl font-bold text-gray-700 block text-center">
                🕐 {t('actions.returnTime')}
              </label>
              <p className="text-base sm:text-lg text-gray-600 text-center">
                {t('actions.returnHelper', 'When you come back')}
              </p>
              <input
                type="time"
                value={returnTime}
                onChange={handleReturnTimeChange}
                className="w-full px-6 py-6 text-2xl sm:text-3xl font-bold border-4 border-green-300 rounded-3xl focus:border-green-500 focus:outline-none bg-green-50"
              />
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="bg-red-100 border-4 border-red-500 rounded-3xl p-6">
              <p className="text-2xl sm:text-3xl font-bold text-red-700 text-center">
                ⚠️ {validationError}
              </p>
            </div>
          )}

          {/* Summary */}
          {departureTime && returnTime && !validationError && (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-3xl p-6 border-4 border-purple-300">
              <p className="text-2xl sm:text-3xl font-bold text-gray-700 text-center">
                {t('actions.leaveSummary', 'Poissaolo')}: {departureTime} - {returnTime}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-8 rounded-3xl text-2xl sm:text-3xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all min-h-[100px] border-4 border-gray-300"
            >
              {t('actions.cancel', 'Peruuta')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedDate || !departureTime || !returnTime}
              className="flex-1 py-8 rounded-3xl text-2xl sm:text-3xl font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all min-h-[100px] shadow-xl border-4 border-orange-600 disabled:bg-gray-300 disabled:border-gray-400 disabled:cursor-not-allowed"
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
