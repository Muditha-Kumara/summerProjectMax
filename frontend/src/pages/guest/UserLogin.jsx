import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import authService from '../../services/authService';
import { toast } from 'react-toastify';

const UserLogin = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);

  const handleChange = (index, value) => {
    if (value.length > 1) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    // Auto-submit when all 4 digits entered
    if (newPin.every(digit => digit !== '') && newPin.join('').length === 4) {
      handleLogin(newPin.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleLogin = async (pinCode) => {
    setLoading(true);
    try {
      const result = await authService.loginUser(pinCode);
      
      if (result.success) {
        toast.success(t('login.title') + '!');
        navigate('/dashboard');
      } else {
        toast.error(result.message || t('login.invalidPin'));
        setPin(['', '', '', '']);
        setTimeout(() => {
          document.getElementById('pin-0')?.focus();
        }, 100);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('alerts.error'));
      setPin(['', '', '', '']);
      setTimeout(() => {
        document.getElementById('pin-0')?.focus();
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="flex flex-col items-center justify-center min-h-[80vh] gap-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-800 mb-4">
          {t('login.title')}
        </h2>
        <p className="text-xl text-gray-600">
          {t('login.subtitle')}
        </p>
      </div>

      <div className="flex gap-4">
        {pin.map((digit, index) => (
          <input
            key={index}
            id={`pin-${index}`}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="pin-input"
            disabled={loading}
            aria-label={`PIN digit ${index + 1}`}
          />
        ))}
      </div>

      {loading && (
        <div className="text-xl text-primary-600 animate-pulse">
          ...
        </div>
      )}

      <button
        onClick={() => handleLogin(pin.join(''))}
        disabled={loading || pin.some(d => d === '')}
        className="w-full max-w-md bg-primary-500 text-white text-2xl font-bold 
                   py-6 rounded-2xl shadow-lg hover:bg-primary-600 
                   active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t('login.submit')}
      </button>
    </motion.div>
  );
};

export default UserLogin;