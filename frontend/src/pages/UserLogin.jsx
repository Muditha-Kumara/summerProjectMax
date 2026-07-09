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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-12">{t('login.title')}</h1>
      
      {!useEmail ? (
        <>
          <div className="text-6xl font-bold text-gray-900 mb-8 tracking-widest min-h-[80px]">
            {pin || '____'}
          </div>
          
          {error && <p className="text-red-600 text-2xl mb-4">{error}</p>}
          
          <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handlePinClick(num.toString())}
                className="min-h-[80px] w-full rounded-2xl bg-blue-600 text-white text-4xl font-bold hover:bg-blue-700 active:bg-blue-800"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="min-h-[80px] w-full rounded-2xl bg-gray-300 text-gray-900 text-xl font-semibold hover:bg-gray-400"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => handlePinClick('0')}
              className="min-h-[80px] w-full rounded-2xl bg-blue-600 text-white text-4xl font-bold hover:bg-blue-700"
            >
              0
            </button>
            <div></div>
          </div>
          
          <button
            onClick={() => setUseEmail(true)}
            className="text-xl text-blue-600 underline"
          >
            Use email instead
          </button>
        </>
      ) : (
        <form onSubmit={handleEmailLogin} className="w-full max-w-md">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="min-h-[80px] w-full rounded-2xl border-4 border-gray-300 text-2xl px-6 mb-4"
            required
          />
          {error && <p className="text-red-600 text-2xl mb-4">{error}</p>}
          <button
            type="submit"
            className="min-h-[80px] w-full rounded-2xl bg-blue-600 text-white text-xl font-semibold hover:bg-blue-700 mb-4"
          >
            {t('login.submit')}
          </button>
          <button
            type="button"
            onClick={() => setUseEmail(false)}
            className="min-h-[80px] w-full rounded-2xl bg-gray-300 text-gray-900 text-xl font-semibold hover:bg-gray-400"
          >
            Use PIN instead
          </button>
        </form>
      )}
    </div>
  );
};

export default UserLogin;