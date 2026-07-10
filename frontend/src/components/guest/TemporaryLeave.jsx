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
        setValidationError(t('actions.minDurationError'));
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
      setValidationError(t('actions.minDurationError'));
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
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-0 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-none sm:rounded-3xl w-full sm:max-w-2xl h-full sm:h-auto max-h-screen sm:max-h-[95vh] overflow-y-auto"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                🚗 {t('actions.away')}
              </h2>
              <p className="text-xl sm:text-2xl text-gray-700 font-medium">
                {t('actions.awayDesc')}
              </p>
            </div>

            {/* Helper Text */}
            <div className="bg-blue-50 border-4 border-blue-300 rounded-2xl p-5">
              <p className="text-lg sm:text-xl text-blue-900 text-center font-semibold leading-relaxed">
                💡 {t('actions.helperText')}
              </p>
            </div>

            {/* Quick Duration Selection */}
            <div className="space-y-3">
              <label className="text-xl sm:text-2xl font-bold text-gray-800 block text-center">
                {t('actions.quickDuration')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {quickDurations.map(({ hours, label }) => (
                  <button
                    key={hours}
                    onClick={() => handleQuickDuration(hours)}
                    className={`py-6 sm:py-7 rounded-2xl text-2xl sm:text-3xl font-bold transition-all min-h-[80px] sm:min-h-[100px] border-4 ${
                      quickDuration === hours
                        ? 'bg-orange-500 text-white shadow-lg scale-105 border-orange-600'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300'
                    }`}
                    aria-pressed={quickDuration === hours}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-3">
              <label className="text-xl sm:text-2xl font-bold text-gray-800 block text-center">
                📅 {t('actions.date')}
              </label>
              <p className="text-base sm:text-lg text-gray-600 text-center">
                {t('actions.dateHelper')}
              </p>
              <input
                type="date"
                value={selectedDate}
                min={minDate}
                max={maxDate}
                onChange={handleDateChange}
                className="w-full px-5 py-5 text-2xl sm:text-3xl font-bold border-4 border-orange-400 rounded-2xl focus:border-orange-600 focus:outline-none bg-orange-50 text-gray-900"
                aria-label="Select date"
              />
              {isToday && (
                <p className="text-lg sm:text-xl text-orange-700 text-center font-bold">
                  ✓ {t('actions.today')}
                </p>
              )}
            </div>

            {/* Time Selection - Stacked on mobile, side-by-side on larger screens */}
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-xl sm:text-2xl font-bold text-gray-800 block text-center">
                  🕐 {t('actions.departureTime')}
                </label>
                <p className="text-base sm:text-lg text-gray-600 text-center">
                  {t('actions.departureHelper')}
                </p>
                <input
                  type="time"
                  value={departureTime}
                  onChange={handleDepartureTimeChange}
                  className="w-full px-5 py-5 text-2xl sm:text-3xl font-bold border-4 border-blue-400 rounded-2xl focus:border-blue-600 focus:outline-none bg-blue-50 text-gray-900"
                  aria-label="Departure time"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xl sm:text-2xl font-bold text-gray-800 block text-center">
                  🕐 {t('actions.returnTime')}
                </label>
                <p className="text-base sm:text-lg text-gray-600 text-center">
                  {t('actions.returnHelper')}
                </p>
                <input
                  type="time"
                  value={returnTime}
                  onChange={handleReturnTimeChange}
                  className="w-full px-5 py-5 text-2xl sm:text-3xl font-bold border-4 border-green-400 rounded-2xl focus:border-green-600 focus:outline-none bg-green-50 text-gray-900"
                  aria-label="Return time"
                />
              </div>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-5">
                <p className="text-xl sm:text-2xl font-bold text-red-800 text-center leading-relaxed">
                  ⚠️ {validationError}
                </p>
              </div>
            )}

            {/* Summary */}
            {departureTime && returnTime && !validationError && (
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-5 border-4 border-purple-400">
                <p className="text-xl sm:text-2xl font-bold text-gray-800 text-center">
                  {t('actions.leaveSummary')}: {departureTime} - {returnTime}
                </p>
              </div>
            )}

            {/* Action Buttons - Stacked on mobile */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
              <button
                onClick={onClose}
                className="w-full py-6 sm:py-7 rounded-2xl text-xl sm:text-2xl font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all min-h-[70px] sm:min-h-[80px] border-4 border-gray-400 active:bg-gray-400"
              >
                {t('actions.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedDate || !departureTime || !returnTime}
                className="w-full py-6 sm:py-7 rounded-2xl text-xl sm:text-2xl font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all min-h-[70px] sm:min-h-[80px] shadow-lg border-4 border-orange-600 disabled:bg-gray-300 disabled:border-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed active:bg-orange-700"
              >
                {t('actions.confirm')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TemporaryLeave;
