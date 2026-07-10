import React from 'react';
import { Outlet } from 'react-router-dom';
import LanguageSelector from '../common/LanguageSelector';

const GuestLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-3 sm:p-4 flex justify-between items-center sticky top-0 z-40">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold text-primary-700 truncate">🏠 Älykäs Lämmitys</h1>
        </div>
        <LanguageSelector />
      </header>

      {/* Main Content */}
      <main className="p-3 sm:p-4 max-w-lg mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default GuestLayout;
