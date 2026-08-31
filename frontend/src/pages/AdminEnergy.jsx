import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

export default function AdminEnergy() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('day');
  const [costSummary, setCostSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCostData();
  }, [period]);

  const fetchCostData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      let startDate, endDate;

      if (period === 'day') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (period === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        startDate = weekAgo;
        endDate = now;
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
      }

      const response = await api.get('/costs/summary', {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
      });

      if (response.data.success) {
        setCostSummary(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch cost data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '--';
    return `${value.toFixed(2)} €`;
  };

  const formatEnergy = (value) => {
    if (value === null || value === undefined) return '--';
    return `${value.toFixed(2)} kWh`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Energy Statistics</h1>
          <button
            onClick={handleLogout}
            className="text-sm px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Period Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`px-6 py-2 rounded font-medium transition-colors ${
                  period === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Energy Consumption</h3>
            <p className="text-4xl font-bold text-blue-600">
              {loading ? '--' : formatEnergy(costSummary?.totalEnergy || 0)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {period === 'day' ? 'This day' : period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'This year'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Average Spot Price</h3>
            <p className="text-4xl font-bold text-green-600">
              {loading ? '--' : `${(costSummary?.avgPricePerKwh * 100 || 0).toFixed(2)} c/kWh`}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {period === 'day' ? 'This day' : period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'This year'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Estimated Cost</h3>
            <p className="text-4xl font-bold text-orange-600">
              {loading ? '--' : formatCurrency(costSummary?.totalCost || 0)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {period === 'day' ? 'This day' : period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'This year'}
            </p>
          </div>
        </div>

        {/* Room Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Energy Consumption by Device</h3>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : !costSummary?.roomBreakdown?.length ? (
            <p className="text-gray-500">No energy data available for this period.</p>
          ) : (
            <div className="space-y-4">
              {costSummary.roomBreakdown.map((room) => (
                <div key={room.roomId} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{room.roomName}</h4>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatEnergy(room.totalEnergy)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(room.totalCost)}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, (room.totalEnergy / (costSummary.totalEnergy || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
