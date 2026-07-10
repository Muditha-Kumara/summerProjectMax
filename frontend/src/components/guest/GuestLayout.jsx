import React from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../common/LanguageSelector';

const GuestLayout = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sm:p-6 flex justify-between items-center sticky top-0 z-40">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-3xl font-bold text-primary-700 truncate">🏠 {t('app.title')}</h1>
        </div>
        <LanguageSelector />
      </header>

      {/* Main Content - Responsive width for mobile to desktop */}
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default GuestLayout;
