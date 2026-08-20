import React, { useState } from 'react';
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

/* ───────── Control Mode Badge ───────── */
const MODE_STYLES = {
  'spot-price': 'bg-green-100 text-green-700',
  thermostat: 'bg-blue-100 text-blue-700',
  clock: 'bg-gray-100 text-gray-600',
  away: 'bg-yellow-100 text-yellow-700',
};

export function ControlModeBadge({ mode }) {
  const style = MODE_STYLES[mode?.toLowerCase()] || 'bg-gray-100 text-gray-500';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${style}`}>
      {mode}
    </span>
  );
}

/* ───────── Room Overview Grid ───────── */
export function RoomOverviewGrid({ rooms = [] }) {
  if (!rooms.length)
    return <p className="text-gray-500 text-sm">No rooms available.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
      {rooms.map((room) => (
        <div
          key={room._id || room.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{room.name}</h3>
            <ControlModeBadge mode={room.controlMode} />
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Current Temp</span>
              <span className="font-medium">
                {room.currentTemp ?? '--'}°C
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Target Temp</span>
              <span className="font-medium">
                {room.targetTemp ?? '--'}°C
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
  if (!data.length)
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Spot Prices (Today)</h3>
        <p className="text-gray-500 text-sm">No price data available.</p>
      </div>
    );

  const chartData = data.map((d) => ({
    hour: d.hour,
    price: +(d.price * 100).toFixed(2), // convert to cents
    heating: d.heating ? d.price * 100 : 0,
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3">Spot Prices (Today)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit=" c" />
          <Tooltip
            formatter={(value) => [`${value} c/kWh`]}
            labelFormatter={(h) => `Hour: ${h}`}
          />
          <Bar dataKey="price" fill="#cbd5e1" radius={[2, 2, 0, 0]} />
          <Bar dataKey="heating" fill="#22c55e" radius={[2, 2, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-gray-300 rounded" /> Price
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-green-500 rounded" /> Heating
          Scheduled
        </span>
      </div>
    </div>
  );
}

/* ───────── Energy Stats Chart ───────── */
const PERIOD_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

export function EnergyStatsChart({ data = [] }) {
  const [period, setPeriod] = useState('day');

  const filtered =
    data.filter((d) => !d.period || d.period === period) || data;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Energy Consumption</h3>
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
        <p className="text-gray-500 text-sm">No energy data available.</p>
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleClick = async () => {
    setLoading(true);
    setMessage('');
    try {
      await api.post('/api/admin/optimize');
      setMessage('Optimization complete!');
      setTimeout(() => setMessage(''), 4000);
      if (onDone) onDone();
    } catch {
      setMessage('Optimization failed.');
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