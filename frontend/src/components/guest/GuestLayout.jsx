import React from 'react';
import { Outlet } from 'react-router-dom';
import LanguageSelector from '../common/LanguageSelector';

const GuestLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary-700">🏠 Smart Heating</h1>
        </div>
        <LanguageSelector />
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-4xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default GuestLayout;
