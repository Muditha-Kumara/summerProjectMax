import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isAdminLogin = location.pathname === '/admin';

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  if (isAdminLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <main className="p-4">
          <Outlet />
        </main>
      </div>
    );
  }

  const navItems = [
    { path: '/admin/dashboard', label: t('admin.nav.dashboard'), icon: '📊' },
    { path: '/admin/rooms', label: t('admin.nav.rooms'), icon: '🏠' },
    { path: '/admin/bookings', label: t('admin.nav.bookings'), icon: '📅' },
    { path: '/admin/energy', label: t('admin.nav.energy'), icon: '⚡' },
    { path: '/admin/settings', label: t('admin.nav.settings'), icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between bg-gray-900 px-4 py-3 shadow-lg lg:hidden">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <span className="text-xl font-bold text-white">{t('admin.panelTitle')}</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="rounded-md p-2 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
          aria-label={isSidebarOpen ? t('admin.closeMenu') : t('admin.openMenu')}
        >
          <svg
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isSidebarOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-20 h-full w-64 bg-gray-900 text-white shadow-xl transition-transform duration-300 lg:translate-x-0 flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 shrink-0">
          <h1 className="text-2xl font-bold text-primary-400">🔥 {t('admin.panelTitle')}</h1>
          <p className="text-sm text-gray-400 mt-1">{t('admin.subtitle')}</p>
        </div>

        <nav className="mt-2 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-3 px-6 py-4 text-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary-600 text-white border-r-4 border-primary-400'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 shrink-0 space-y-3">
          {/* Language Selector */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg">
            <span className="text-lg">🌐</span>
            <select
              value={i18n.language?.split('-')[0] || 'fi'}
              onChange={handleLanguageChange}
              className="flex-1 bg-transparent text-white text-sm focus:outline-none cursor-pointer"
            >
              <option value="fi" className="text-gray-900">🇫🇮 Suomi</option>
              <option value="sv" className="text-gray-900">🇸🇪 Svenska</option>
              <option value="en" className="text-gray-900">🇬🇧 English</option>
            </select>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <span className="text-xl">🚪</span>
            <span>{t('admin.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-10 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-16 lg:pt-0 lg:ml-64 p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
};

export default AdminLayout;
