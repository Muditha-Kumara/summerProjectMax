import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import api from '../services/api';

/* ───────── Device Status Badge ───────── */
export function DeviceStatusBadge({ heatingOn, deviceOnline }) {
  if (!deviceOnline) {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-500">
        offline
      </span>
    );
  }

  const isOn = heatingOn === true;
  const style = isOn
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700';
  const label = isOn ? 'ON' : 'OFF';

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${style}`}>
      {label}
    </span>
  );
}

/* ───────── Room Overview Grid ───────── */
export function RoomOverviewGrid({ rooms = [] }) {
  const { t } = useTranslation();
  if (!rooms.length)
    return <p className="text-gray-500 text-sm">{t('admin.widgets.noRoomsAvailable')}</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
      {rooms.map((room) => (
        <div
          key={room._id || room.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{room.name}</h3>
            <DeviceStatusBadge
              heatingOn={room.heating_on}
              deviceOnline={room.device_online}
            />
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('admin.widgets.currentTemp')}</span>
              <span className="font-medium">
                {room.current_temp ?? room.currentTemp ?? '--'}°C
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('admin.widgets.targetTemp')}</span>
              <span className="font-medium">
                {room.target_temp ?? room.targetTemp ?? '--'}°C
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────── Spot Price Chart ───────── */
export function SpotPriceChart({ data = [] }) {
  const { t } = useTranslation();
  if (!data.length)
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">{t('admin.widgets.spotPricesToday')}</h3>
        <p className="text-gray-500 text-sm">{t('admin.widgets.noPriceData')}</p>
      </div>
    );

  const chartData = data.map((d) => ({
    hour: d.hour,
    price: +(d.price * 100).toFixed(2), // convert to cents
    heating: d.heating ? d.price * 100 : 0,
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3">{t('admin.widgets.spotPricesToday')}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit=" c" />
          <Tooltip
            formatter={(value) => [`${value} c/kWh`]}
            labelFormatter={(h) => `${t('admin.widgets.hour')}: ${h}`}
          />
          <Bar dataKey="price" fill="#cbd5e1" radius={[2, 2, 0, 0]} />
          <Bar dataKey="heating" fill="#22c55e" radius={[2, 2, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-gray-300 rounded" /> {t('admin.widgets.price')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-green-500 rounded" /> {t('admin.widgets.heatingScheduled')}
        </span>
      </div>
    </div>
  );
}

/* ───────── Energy Stats Chart ───────── */
export function EnergyStatsChart({ data = [] }) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('day');

  const PERIOD_OPTIONS = [
    { value: 'day', label: t('admin.widgets.day') },
    { value: 'week', label: t('admin.widgets.week') },
    { value: 'month', label: t('admin.widgets.month') },
    { value: 'year', label: t('admin.widgets.year') },
  ];

  const filtered =
    data.filter((d) => !d.period || d.period === period) || data;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{t('admin.widgets.energyConsumption')}</h3>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {!filtered.length ? (
        <p className="text-gray-500 text-sm">{t('admin.widgets.noEnergyData')}</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit=" kWh" />
            <Tooltip formatter={(v) => [`${v} kWh`]} />
            <Area
              type="monotone"
              dataKey="kWh"
              stroke="#3b82f6"
              fill="#93c5fd"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ───────── Optimize All Button ───────── */
export function OptimizeAllButton({ onDone }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleClick = async () => {
    setLoading(true);
    setMessage('');
    try {
      await api.post('/api/admin/optimize');
      setMessage(t('admin.widgets.optimizationComplete'));
      setTimeout(() => setMessage(''), 4000);
      if (onDone) onDone();
    } catch {
      setMessage(t('admin.widgets.optimizationFailed'));
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-5 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 text-white"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}
        {loading ? 'Optimizing…' : 'Optimize All Rooms'}
      </button>
      {message && (
        <span
          className={`text-sm font-medium ${
            message.includes('complete') ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}