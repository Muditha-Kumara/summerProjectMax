import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import authService from '../../services/authService';
import { toast } from 'react-toastify';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await authService.loginAdmin(formData.email, formData.password);

      if (result.success) {
        navigate('/admin/dashboard');
      } else {
        toast.error(result.message || t('admin.login.invalidCredentials'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('admin.login.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <motion.div
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Language Selector */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
            <span className="text-lg">🌐</span>
            <select
              value={i18n.language?.split('-')[0] || 'fi'}
              onChange={handleLanguageChange}
              className="bg-transparent text-gray-700 text-sm font-medium focus:outline-none cursor-pointer"
            >
              <option value="fi">🇫🇮 Suomi</option>
              <option value="sv">🇸🇪 Svenska</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{t('admin.login.title')}</h1>
          <p className="text-gray-600">{t('admin.login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin.login.emailLabel')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
              placeholder={t('admin.login.emailPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin.login.passwordLabel')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
              placeholder={t('admin.login.passwordPlaceholder')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('admin.login.signingIn') : t('admin.login.signIn')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>{t('admin.login.defaultCredentials')}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;

