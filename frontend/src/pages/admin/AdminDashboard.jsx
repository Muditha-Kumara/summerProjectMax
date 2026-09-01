import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  RoomOverviewGrid,
  SpotPriceChart,
  EnergyStatsChart,
  OptimizeAllButton,
} from '../../components/AdminWidgets';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState([]);
  const [outdoorTemp, setOutdoorTemp] = useState(null);
  const [weather, setWeather] = useState(null);
  const [spotPrices, setSpotPrices] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [apiStatus, setApiStatus] = useState({ backend: 'checking', weather: 'checking', prices: 'checking' });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roomsRes, pricesRes, bookingsRes] = await Promise.allSettled([
        api.get('/rooms'),
        api.get('/optimization/spot-prices?hours=48'),
        api.get('/bookings/active'),
      ]);

      if (roomsRes.status === 'fulfilled' && roomsRes.value.data) {
        const { rooms: roomsData, outdoorTemp: outTemp, weather: weatherData } = roomsRes.value.data;
        setRooms(roomsData || []);
        setOutdoorTemp(outTemp);
        setWeather(weatherData);
        setApiStatus(prev => ({ ...prev, backend: 'online', weather: weatherData ? 'online' : 'offline' }));
      } else {
        setApiStatus(prev => ({ ...prev, backend: 'offline' }));
      }

      if (pricesRes.status === 'fulfilled' && pricesRes.value.data) {
        const prices = pricesRes.value.data.prices || [];
        setSpotPrices(prices.map((p, i) => ({
          timestamp: p.timestamp,
          hour: new Date(p.timestamp).getHours(),
          price: p.price,
          heating: i % 3 === 0, // Simulate heating schedule
        })));
        setApiStatus(prev => ({ ...prev, prices: prices.length > 0 ? 'online' : 'offline' }));
      }

      if (bookingsRes.status === 'fulfilled' && bookingsRes.value.data) {
        setActiveBookings(bookingsRes.value.data.bookings || []);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
      setApiStatus({ backend: 'offline', weather: 'offline', prices: 'offline' });
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    totalRooms: rooms.length,
    activeRooms: rooms.filter(r => r.control_mode !== 'away').length,
    avgTemp: rooms.length > 0
      ? (rooms.reduce((sum, r) => sum + (r.current_temp || 0), 0) / rooms.length).toFixed(1)
      : '--',
    avgTarget: rooms.length > 0
      ? (rooms.reduce((sum, r) => sum + (r.target_temp || 0), 0) / rooms.length).toFixed(1)
      : '--',
    currentPrice: spotPrices.length > 0
      ? spotPrices.find(p => p.hour === new Date().getHours())?.price || spotPrices[0]?.price
      : null,
    avgPrice: spotPrices.length > 0
      ? (spotPrices.reduce((sum, p) => sum + p.price, 0) / spotPrices.length).toFixed(4)
      : null,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{t('admin.dashboard.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.dashboard.overview')}
            {lastUpdated && (
              <span className="ml-2">
                • {t('admin.dashboard.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? t('admin.dashboard.refreshing') : t('admin.dashboard.refresh')}
          </button>
          <OptimizeAllButton onDone={fetchData} />
        </div>
      </div>

      {/* System Status Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <StatusIndicator label={t('admin.dashboard.backendApi')} status={apiStatus.backend} />
            <StatusIndicator label={t('admin.dashboard.weatherService')} status={apiStatus.weather} />
            <StatusIndicator label={t('admin.dashboard.priceData')} status={apiStatus.prices} />
          </div>
          {outdoorTemp !== null && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg w-fit">
              <span className="text-2xl">🌡️</span>
              <div>
                <p className="text-xs text-gray-500">{t('admin.dashboard.outdoor')}</p>
                <p className="text-lg font-bold text-blue-700">{outdoorTemp}°C</p>
              </div>
              {weather && (
                <span className="text-sm text-gray-600 capitalize ml-2">
                  {weather.description}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title={t('admin.dashboard.totalRooms')}
          value={stats.totalRooms}
          subtitle={`${stats.activeRooms} ${t('admin.dashboard.active')}`}
          icon="🏠"
          color="blue"
        />
        <StatCard
          title={t('admin.dashboard.avgTemperature')}
          value={`${stats.avgTemp}°C`}
          subtitle={`${t('admin.dashboard.target')}: ${stats.avgTarget}°C`}
          icon="🌡️"
          color="orange"
        />
        <StatCard
          title={t('admin.dashboard.currentPrice')}
          value={stats.currentPrice ? `${(stats.currentPrice * 100).toFixed(2)} c/kWh` : '--'}
          subtitle={stats.avgPrice ? `${t('admin.dashboard.target')}: ${(stats.avgPrice * 100).toFixed(2)} c/kWh` : t('admin.dashboard.noData')}
          icon="💰"
          color="green"
        />
        <StatCard
          title={t('admin.dashboard.activeBookings')}
          value={activeBookings.length}
          subtitle={activeBookings.length > 0 ? t('admin.dashboard.guestsCheckedIn') : t('admin.dashboard.noGuests')}
          icon="📅"
          color="purple"
        />
      </div>

      {/* Room Overview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">{t('admin.dashboard.roomOverview')}</h2>
          <Link
            to="/admin/rooms"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('admin.dashboard.viewAll')}
          </Link>
        </div>
        <RoomOverviewGrid rooms={rooms} />
      </section>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('admin.dashboard.spotPrices')}</h2>
          <SpotPriceChart data={spotPrices} />
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('admin.dashboard.energyConsumption')}</h2>
          <EnergyStatsChart data={[]} />
        </section>
      </div>

      {/* Active Bookings */}
      {activeBookings.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">{t('admin.dashboard.activeBookings')}</h2>
            <Link
              to="/admin/bookings"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('admin.dashboard.viewAll')}
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('admin.dashboard.guest')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('admin.dashboard.checkIn')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('admin.dashboard.checkOut')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('admin.dashboard.preferredTemp')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('admin.dashboard.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeBookings.slice(0, 5).map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{booking.guest_name}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(booking.check_in)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(booking.check_out)}</td>
                    <td className="px-4 py-3 text-gray-600">{booking.preferred_temp}°C</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('admin.dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            title={t('admin.dashboard.manageRooms')}
            description={t('admin.dashboard.manageRoomsDesc')}
            icon="🏠"
            link="/admin/rooms"
          />
          <QuickActionCard
            title={t('admin.dashboard.viewBookings')}
            description={t('admin.dashboard.viewBookingsDesc')}
            icon="📅"
            link="/admin/bookings"
          />
          <QuickActionCard
            title={t('admin.dashboard.systemSettings')}
            description={t('admin.dashboard.systemSettingsDesc')}
            icon="⚙️"
            link="/admin/settings"
          />
        </div>
      </section>
    </div>
  );
}

/* ───────── Helper Components ───────── */

function StatusIndicator({ label, status }) {
  const colors = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    checking: 'bg-yellow-500 animate-pulse',
  };
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${colors[status] || colors.checking}`} />
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200',
    purple: 'bg-purple-50 border-purple-200',
  };
  return (
    <div className={`rounded-xl border p-5 ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1 truncate">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>}
        </div>
        <span className="text-3xl opacity-60 shrink-0">{icon}</span>
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, icon, link }) {
  return (
    <Link
      to={link}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all group"
    >
      <div className="flex items-center gap-4">
        <span className="text-3xl group-hover:scale-110 transition-transform shrink-0">{icon}</span>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors truncate">
            {title}
          </h3>
          <p className="text-sm text-gray-500 truncate">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
