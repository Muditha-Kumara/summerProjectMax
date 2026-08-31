import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const AdminEnergy = () => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('day');
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCostData();
  }, [timeRange]);

  const fetchCostData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      let startDate, endDate;

      if (timeRange === 'day') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (timeRange === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        startDate = weekAgo;
        endDate = now;
      } else if (timeRange === 'month') {
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
        setCostData(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch cost data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatEnergy = (value) => {
    if (value === null || value === undefined) return '--';
    return `${value.toFixed(2)} kWh`;
  };

  const formatPrice = (value) => {
    if (value === null || value === undefined) return '--';
    return `${(value * 100).toFixed(2)} c/kWh`;
  };

  const formatCost = (value) => {
    if (value === null || value === undefined) return '--';
    return `${value.toFixed(2)} €`;
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">{t('energy.title')}</h1>
      
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setTimeRange('day')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              timeRange === 'day'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('energy.today')}
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              timeRange === 'week'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('energy.week')}
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              timeRange === 'month'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('energy.month')}
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              timeRange === 'year'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {t('energy.year')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">{t('energy.consumption')}</h4>
            <p className="text-3xl font-bold text-primary-600">
              {loading ? '--' : formatEnergy(costData?.totalEnergy || 0)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {timeRange === 'day' ? t('energy.today') : timeRange === 'week' ? t('energy.week') : timeRange === 'month' ? t('energy.month') : t('energy.year')}
            </p>
          </div>

          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">{t('energy.avgPrice')}</h4>
            <p className="text-3xl font-bold text-green-600">
              {loading ? '--' : formatPrice(costData?.avgPricePerKwh || 0)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {timeRange === 'day' ? t('energy.today') : timeRange === 'week' ? t('energy.week') : timeRange === 'month' ? t('energy.month') : t('energy.year')}
            </p>
          </div>

          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">{t('energy.cost')}</h4>
            <p className="text-3xl font-bold text-orange-600">
              {loading ? '--' : formatCost(costData?.totalCost || 0)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {timeRange === 'day' ? t('energy.today') : timeRange === 'week' ? t('energy.week') : timeRange === 'month' ? t('energy.month') : t('energy.year')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{t('energy.byDevice')}</h3>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : !costData?.roomBreakdown?.length ? (
          <p className="text-gray-500">No energy data available for this period.</p>
        ) : (
          <div className="space-y-4">
            {costData.roomBreakdown.map((room) => (
              <div key={room.roomId} className="border-b border-gray-200 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{room.roomName}</h4>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatEnergy(room.totalEnergy)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCost(room.totalCost)}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (room.totalEnergy / (costData.totalEnergy || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEnergy;
