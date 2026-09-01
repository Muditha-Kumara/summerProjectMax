import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
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
            <h3 className="font-semibold text-gray-900">
              {t(`roomNames.${room.name}`, room.name)}
            </h3>
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
const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function SpotPriceChart({ data = [] }) {
  const { t } = useTranslation();
  const [day, setDay] = useState('today');

  const now = new Date();
  const todayKey = dateKey(now);
  const tomorrowKey = dateKey(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  // Bucket each price point by its local calendar date (fallback: today,
  // for legacy data without timestamps).
  const withDates = data.map((d) => ({
    ...d,
    dateKey: d.timestamp ? dateKey(new Date(d.timestamp)) : todayKey,
  }));
  const filtered = withDates.filter((d) =>
    d.dateKey === (day === 'tomorrow' ? tomorrowKey : todayKey)
  );

  const title =
    day === 'tomorrow'
      ? t('admin.widgets.spotPricesTomorrow')
      : t('admin.widgets.spotPricesToday');

  const toggle = (
    <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs font-semibold shrink-0">
      {['today', 'tomorrow'].map((opt) => (
        <button
          key={opt}
          onClick={() => setDay(opt)}
          className={`px-3 py-1.5 transition-colors ${
            day === opt
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          {t(`admin.widgets.${opt}`)}
        </button>
      ))}
    </div>
  );

  const header = (
    <div className="flex items-center justify-between gap-2 mb-3">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {toggle}
    </div>
  );

  if (!filtered.length)
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {header}
        <p className="text-gray-500 text-sm">{t('admin.widgets.noPriceData')}</p>
      </div>
    );

  const chartData = filtered.map((d) => ({
    hour: d.hour,
    price: +(d.price * 100).toFixed(2), // convert to cents
    heating: d.heating ? d.price * 100 : 0,
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {header}
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

/* ───────── Energy Stats Chart ─────────
 * Self-fetching widget backed by GET /costs/timeseries.
 * Dashboard shows only period totals (kWh + cost); the detailed
 * per-bucket chart lives on the /admin/energy page.
 * Day   → total for today's 24 hours
 * Week  → total Mon–Sun
 * Month → total for the calendar month
 * Year  → total for the calendar year
 */
function getEnergyDateRange(period) {
  const now = new Date();
  if (period === 'day') {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    };
  }
  if (period === 'week') {
    // Monday-based week: this week's Monday → next Monday
    const dayOfWeek = now.getDay(); // 0=Sun … 6=Sat
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
    return { startDate: monday, endDate: nextMonday };
  }
  if (period === 'month') {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }
  return {
    startDate: new Date(now.getFullYear(), 0, 1),
    endDate: new Date(now.getFullYear() + 1, 0, 1),
  };
}

export function EnergyStatsChart() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('day');
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  const PERIOD_OPTIONS = [
    { value: 'day', label: t('admin.widgets.day') },
    { value: 'week', label: t('admin.widgets.week') },
    { value: 'month', label: t('admin.widgets.month') },
    { value: 'year', label: t('admin.widgets.year') },
  ];

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = getEnergyDateRange(period);
        const fmt = (d) => d.toISOString().split('T')[0];
        const res = await api.get('/costs/timeseries', {
          params: { startDate: fmt(startDate), endDate: fmt(endDate) },
        });
        if (!cancelled && res.data?.success) {
          setPoints(res.data.data.points || []);
        }
      } catch {
        if (!cancelled) setPoints([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const totalKwh = points.reduce((sum, p) => sum + (p.totalEnergy || 0), 0);
  const totalCost = points.reduce((sum, p) => sum + (p.totalCost || 0), 0);
  const hasData = totalKwh > 0;

  const periodLabel = {
    day: t('admin.widgets.today'),
    week: t('admin.widgets.thisWeek'),
    month: t('admin.widgets.thisMonth'),
    year: t('admin.widgets.thisYear'),
  }[period];

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
      {loading ? (
        <p className="text-gray-500 text-sm">{t('admin.widgets.loading')}</p>
      ) : !hasData ? (
        <p className="text-gray-500 text-sm">{t('admin.widgets.noEnergyData')}</p>
      ) : (
        <div className="py-4">
          <p className="text-sm text-gray-500 mb-1">{periodLabel}</p>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-4xl font-bold text-blue-600">{totalKwh.toFixed(1)} kWh</p>
              <p className="text-xs text-gray-500 mt-1">{t('admin.widgets.totalConsumption')}</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-orange-600">{totalCost.toFixed(2)} €</p>
              <p className="text-xs text-gray-500 mt-1">{t('admin.widgets.estimatedCost')}</p>
            </div>
          </div>
          <Link
            to="/admin/energy"
            className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('admin.widgets.viewDetails')} →
          </Link>
        </div>
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