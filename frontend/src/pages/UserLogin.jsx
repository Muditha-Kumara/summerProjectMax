import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const UserLogin = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [useEmail, setUseEmail] = useState(false);
  const [error, setError] = useState('');

  const handlePinClick = (number) => {
    if (pin.length < 4) {
      const newPin = pin + number;
      setPin(newPin);
      if (newPin.length === 4) {
        handlePinLogin(newPin);
      }
    }
  };

  const handlePinLogin = async (pinCode) => {
    try {
      const response = await axios.post('/api/auth/user/login', { pin: pinCode });
      localStorage.setItem('token', response.data.token);
      if (response.data.booking) {
        localStorage.setItem('bookingData', JSON.stringify(response.data.booking));
      }
      navigate('/');
    } catch (err) {
      setError('Invalid PIN');
      setPin('');
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/bookings/validate', { email });
      localStorage.setItem('token', response.data.token);
      if (response.data.booking) {
        localStorage.setItem('bookingData', JSON.stringify(response.data.booking));
      }
      navigate('/');
    } catch (err) {
      setError('Invalid booking');
    }
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">{t('login.title')}</h1>
        <p className="text-lg sm:text-xl text-gray-600 mb-8 text-center">{t('login.subtitle')}</p>
        
        {!useEmail ? (
          <>
            <div className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 tracking-widest min-h-[80px] flex items-center justify-center bg-white rounded-3xl p-4 shadow-lg border-2 border-gray-200">
              {pin || '____'}
            </div>
            
            {error && <p className="text-red-600 text-xl sm:text-2xl mb-4 text-center font-semibold">{error}</p>}
            
            <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePinClick(num.toString())}
                  className="min-h-[80px] sm:min-h-[90px] w-full rounded-2xl bg-orange-500 text-white text-4xl sm:text-5xl font-bold hover:bg-orange-600 active:bg-orange-700 active:scale-95 transition-all shadow-lg border-2 border-orange-600"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="min-h-[80px] sm:min-h-[90px] w-full rounded-2xl bg-gray-200 text-gray-800 text-lg sm:text-xl font-bold hover:bg-gray-300 active:scale-95 transition-all shadow-lg border-2 border-gray-300"
              >
                {t('actions.cancel')}
              </button>
              <button
                onClick={() => handlePinClick('0')}
                className="min-h-[80px] sm:min-h-[90px] w-full rounded-2xl bg-orange-500 text-white text-4xl sm:text-5xl font-bold hover:bg-orange-600 active:bg-orange-700 active:scale-95 transition-all shadow-lg border-2 border-orange-600"
              >
                0
              </button>
              <div></div>
            </div>
            
            <button
              onClick={() => setUseEmail(true)}
              className="w-full text-lg sm:text-xl text-orange-600 underline font-semibold py-3 hover:text-orange-700"
            >
              {t('login.useEmail')}
            </button>
          </>
        ) : (
          <form onSubmit={handleEmailLogin} className="w-full">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
              className="min-h-[80px] w-full rounded-2xl border-4 border-gray-300 text-xl sm:text-2xl px-6 mb-4 bg-white shadow-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-200 transition-all"
              required
            />
            {error && <p className="text-red-600 text-xl sm:text-2xl mb-4 text-center font-semibold">{error}</p>}
            <button
              type="submit"
              className="min-h-[80px] w-full rounded-2xl bg-orange-500 text-white text-xl sm:text-2xl font-bold hover:bg-orange-600 active:scale-95 transition-all mb-4 shadow-lg"
            >
              {t('login.submit')}
            </button>
            <button
              type="button"
              onClick={() => setUseEmail(false)}
              className="min-h-[80px] w-full rounded-2xl bg-gray-200 text-gray-800 text-lg sm:text-xl font-bold hover:bg-gray-300 active:scale-95 transition-all shadow-lg"
            >
              {t('login.usePin')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserLogin;