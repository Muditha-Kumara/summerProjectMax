import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
  RoomOverviewGrid,
  SpotPriceChart,
  EnergyStatsChart,
  OptimizeAllButton,
} from '../components/AdminWidgets';

const NAV_ITEMS = [
  { key: 'overview', label: 'Overview' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'energy', label: 'Energy' },
  { key: 'settings', label: 'Settings' },
];

export default function AdminDashboard({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [rooms, setRooms] = useState([]);
  const [spotPrices, setSpotPrices] = useState([]);
  const [energyData, setEnergyData] = useState([]);
  const [systemStatus, setSystemStatus] = useState('Unknown');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [roomsRes, pricesRes, energyRes, statusRes] = await Promise.allSettled([
        api.get('/api/v1/rooms'),
        api.get('/api/v1/settings/spot-prices'),
        api.get('/api/v1/energy/stats'),
        api.get('/api/v1/settings/status'),
      ]);
      if (roomsRes.status === 'fulfilled') {
        const roomsData = roomsRes.value.data;
        setRooms(roomsData.rooms || roomsData);
      }
      if (pricesRes.status === 'fulfilled') setSpotPrices(pricesRes.value.data);
      if (energyRes.status === 'fulfilled') setEnergyData(energyRes.value.data);
      if (statusRes.status === 'fulfilled') setSystemStatus(statusRes.value.data.status || 'Online');
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const handleNavigate = (key) => {
    if (onNavigate) onNavigate(key);
    setActiveTab(key);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold">Heating Admin</h2>
        </div>
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavigate(item.key)}
              className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === item.key
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">System Status:</span>
            <span
              className={`text-sm font-semibold px-2 py-0.5 rounded ${
                systemStatus === 'Online'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {systemStatus}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Logout
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
                <OptimizeAllButton onDone={fetchData} />
              </div>
              <RoomOverviewGrid rooms={rooms} />
              <SpotPriceChart data={spotPrices} />
              <EnergyStatsChart data={energyData} />
            </div>
          )}
          {activeTab === 'bookings' && (
            <div>
              <p className="text-gray-500 text-sm">Redirect to bookings view...</p>
            </div>
          )}
          {activeTab === 'energy' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-gray-900">Energy Analytics</h1>
              <EnergyStatsChart data={energyData} />
            </div>
          )}
          {activeTab === 'settings' && (
            <div>
              <p className="text-gray-500 text-sm">Redirect to settings view...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

</parameter name="contents">

</ARG>