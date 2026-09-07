import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ── Constants ──

const TIMERANGE_OPTIONS = [
  { key: 'day', labelKey: 'energy.today' },
  { key: 'week', labelKey: 'energy.week' },
  { key: 'month', labelKey: 'energy.month' },
  { key: 'year', labelKey: 'energy.year' },
];

const ROOM_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

const ROOM_DASHES = [
  '', '5 5', '3 3', '10 5',
  '2 2', '8 4', '1 3', '6 6',
];

// ── Custom Tooltip ──

const CustomTooltip = ({ active, payload, label, t, fmtEnergy, fmtCents, fmtCost }) => {
  if (!active || !payload || !payload.length) return null;

  const roomItems = [];
  let totalEnergyItem = null;
  let totalCostItem = null;
  let spotPriceItem = null;

  payload.forEach((p) => {
    if (p.dataKey === 'totalEnergy') totalEnergyItem = p;
    else if (p.dataKey === 'totalCost') totalCostItem = p;
    else if (p.dataKey === 'spotPriceCents') spotPriceItem = p;
    else if (p.dataKey.startsWith('roomCost_')) { /* skip – merged into roomItems */ }
    else if (p.dataKey.startsWith('room_')) roomItems.push(p);
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[260px]">
      <div className="font-semibold text-gray-700 mb-2 border-b pb-1">{label}</div>
      {roomItems.length > 0 && (
        <div className="mb-2">
          <div className="text-gray-400 mb-1">{t('energy.consumption')}</div>
          {roomItems.map((item) => {
            const roomId = item.dataKey.replace('room_', '');
            const costItem = payload.find((p) => p.dataKey === `roomCost_${roomId}`);
            return (
              <div key={item.dataKey} className="flex items-center justify-between py-0.5 gap-4">
                <span className="flex items-center gap-1.5 flex-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-medium text-gray-700">{fmtEnergy(item.value)}</span>
                {costItem != null && (
                  <span className="font-medium text-gray-700">{fmtCost(costItem.value)}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="border-t pt-2 space-y-1">
        {totalEnergyItem && (
          <div className="flex justify-between">
            <span className="text-gray-500">{t('energy.totalConsumption')}</span>
            <span className="font-semibold text-blue-600">{fmtEnergy(totalEnergyItem.value)}</span>
          </div>
        )}
        {spotPriceItem && (
          <div className="flex justify-between">
            <span className="text-gray-500">{t('energy.spotPrice')}</span>
            <span className="font-semibold text-amber-600">{fmtCents(spotPriceItem.value)}</span>
          </div>
        )}
        {totalCostItem && (
          <div className="flex justify-between">
            <span className="text-gray-500">{t('energy.cost')}</span>
            <span className="font-semibold text-red-600">{fmtCost(totalCostItem.value)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Component ──

const AdminEnergy = () => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('day');
  const [rooms, setRooms] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, [timeRange]);

  // ── Date helpers ──

  const getDateRange = () => {
    const now = new Date();
    if (timeRange === 'day') {
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      };
    }
    if (timeRange === 'week') {
      // Monday to Sunday of current week
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday-based
      const monday = new Date(now);
      monday.setDate(now.getDate() - mondayOffset);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 7);
      return { startDate: monday, endDate: sunday };
    }
    if (timeRange === 'month') {
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      };
    }
    return {
      startDate: new Date(now.getFullYear(), 0, 1),
      endDate: new Date(now.getFullYear() + 1, 0, 1),
    };
  };

  // Format as a LOCAL YYYY-MM-DD (toISOString would shift the date back a
  // day for UTC+ viewers, e.g. Finnish midnight → previous day in UTC).
  const toDateStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Minutes ahead of UTC (EEST=180, EET=120) so the server buckets align
  // with the browser wall clock instead of server UTC.
  const tzOffsetMinutes = () => -new Date().getTimezoneOffset();

  // ── Fetch ──

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();
      const params = {
        startDate: toDateStr(startDate),
        endDate: toDateStr(endDate),
        tzOffset: tzOffsetMinutes(),
      };

      const tsRes = await api.get('/costs/timeseries', { params });

      if (tsRes.data.success) {
        setRooms(tsRes.data.data.rooms || []);
        setPoints(tsRes.data.data.points || []);
      }
    } catch (err) {
      console.error('Failed to fetch energy data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Formatters ──

  const fmtEnergy = (v) => (v != null ? `${Number(v).toFixed(2)} kWh` : '--');
  const fmtPrice = (v) => (v != null ? `${(v * 100).toFixed(2)} c/kWh` : '--');
  const fmtCost = (v) => (v != null ? `${Number(v).toFixed(2)} €` : '--');
  const fmtCents = (v) => (v != null ? `${Number(v).toFixed(2)} c/kWh` : '--');

  // Add a cents/kWh field so the spot-price axis reads naturally
  // (5.2 instead of 0.052 EUR/kWh)
  const chartPoints = React.useMemo(
    () =>
      points.map((p) => ({
        ...p,
        spotPriceCents: p.spotPrice != null ? Math.round(p.spotPrice * 10000) / 100 : null,
      })),
    [points]
  );

  // Timezone of the plotted buckets, e.g. "EEST" with "UTC+3" as fallback
  const tzLabel = React.useMemo(() => {
    const abbr = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value;
    if (abbr && !/^GMT|[+-]\d/.test(abbr)) return abbr;
    const hours = -new Date().getTimezoneOffset() / 60;
    return `UTC${hours >= 0 ? '+' : ''}${hours}`;
  }, []);

  // ── Summary totals (derived from the TZ-correct timeseries so the cards
  //     always agree with the chart) ──

  const summary = React.useMemo(() => {
    if (!points.length) return null;
    const totalEnergy = points.reduce((s, p) => s + (p.totalEnergy || 0), 0);
    const totalCost = points.reduce((s, p) => s + (p.totalCost || 0), 0);
    return {
      totalEnergy,
      totalCost,
      avgPricePerKwh: totalEnergy > 0 ? totalCost / totalEnergy : 0,
    };
  }, [points]);

  // ── Pie chart data ──

  const pieData = React.useMemo(() => {
    if (!points.length || !rooms.length) return { energy: [], cost: [] };
    const energy = [];
    const cost = [];
    rooms.forEach((room, i) => {
      const totalEnergy = points.reduce((sum, p) => sum + (p[`room_${room.id}`] || 0), 0);
      const totalCost = points.reduce((sum, p) => sum + (p[`roomCost_${room.id}`] || 0), 0);
      energy.push({ name: t(`roomNames.${room.name}`, room.name), value: Math.round(totalEnergy * 1000) / 1000, color: ROOM_COLORS[i % ROOM_COLORS.length] });
      cost.push({ name: t(`roomNames.${room.name}`, room.name), value: Math.round(totalCost * 100) / 100, color: ROOM_COLORS[i % ROOM_COLORS.length] });
    });
    return { energy, cost };
  }, [points, rooms, t]);

  // ── Render ──

  const hasData = points.length > 0;

  return (
    <div className="space-y-6">
      {/* Header + time-range pills */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800">{t('energy.title')}</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TIMERANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTimeRange(opt.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === opt.key
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon="⚡" label={t('energy.consumption')} value={fmtEnergy(summary?.totalEnergy)} loading={loading} color="blue" />
        <StatCard icon="📊" label={t('energy.avgPrice')} value={fmtPrice(summary?.avgPricePerKwh)} loading={loading} color="green" />
        <StatCard icon="💰" label={t('energy.cost')} value={fmtCost(summary?.totalCost)} loading={loading} color="orange" />
      </div>

      {/* Main chart: ALL lines in ONE LineChart */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          {t('energy.timeseries')}{' '}
          <span className="text-sm font-normal text-gray-400">({t('energy.timeAxis', 'Time')}: {tzLabel})</span>
        </h3>
        {loading ? (
          <ChartSkeleton />
        ) : !hasData ? (
          <EmptyState message={t('energy.noData')} />
        ) : (
          <ResponsiveContainer width="100%" height={480}>
            <LineChart data={chartPoints} margin={{ top: 20, right: 110, left: 70, bottom: 45 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              {/* X-axis: bucket labels (hour / day / month), thinned out when crowded */}
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#d1d5db"
                interval="preserveStartEnd"
                minTickGap={20}
                angle={timeRange === 'day' ? -45 : 0}
                textAnchor={timeRange === 'day' ? 'end' : 'middle'}
                height={timeRange === 'day' ? 50 : 30}
              />
              {/* Left Y-axis (blue): energy in kWh — room lines AND total share it */}
              <YAxis
                yAxisId="energy"
                orientation="left"
                tick={{ fontSize: 11, fill: '#2563eb' }}
                stroke="#93c5fd"
                width={52}
                tickFormatter={(v) => `${v}`}
                label={{ value: 'Energy (kWh)', angle: -90, position: 'insideLeft', offset: 18, style: { fontSize: 12, fill: '#2563eb', textAnchor: 'middle' } }}
              />
              {/* Right Y-axis (red): cost in € */}
              <YAxis
                yAxisId="totalCost"
                orientation="right"
                tick={{ fontSize: 11, fill: '#dc2626' }}
                stroke="#fca5a5"
                width={52}
                tickFormatter={(v) => `${v}`}
                label={{ value: 'Cost (€)', angle: 90, position: 'insideRight', offset: 14, style: { fontSize: 12, fill: '#dc2626', textAnchor: 'middle' } }}
              />
              {/* Far right Y-axis (amber): spot price in c/kWh */}
              <YAxis
                yAxisId="spotPrice"
                orientation="right"
                tick={{ fontSize: 11, fill: '#d97706' }}
                stroke="#fcd34d"
                width={56}
                tickFormatter={(v) => `${v}`}
                label={{ value: 'Spot (c/kWh)', angle: 90, position: 'insideRight', offset: 20, style: { fontSize: 12, fill: '#d97706', textAnchor: 'middle' } }}
              />
              <Tooltip content={<CustomTooltipWrapper t={t} fmtEnergy={fmtEnergy} fmtCents={fmtCents} fmtCost={fmtCost} />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />

              {/* Per-room energy lines */}
              {rooms.map((room, i) => (
                <Line
                  key={room.id}
                  yAxisId="energy"
                  type="monotone"
                  dataKey={`room_${room.id}`}
                  name={t(`roomNames.${room.name}`, room.name)}
                  stroke={ROOM_COLORS[i % ROOM_COLORS.length]}
                  strokeDasharray={ROOM_DASHES[i % ROOM_DASHES.length]}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              ))}

              {/* Per-room cost lines (invisible, used only for tooltip data) */}
              {rooms.map((room) => (
                <Line
                  key={`cost_${room.id}`}
                  yAxisId="totalCost"
                  type="monotone"
                  dataKey={`roomCost_${room.id}`}
                  name={`cost_${room.id}`}
                  stroke="transparent"
                  strokeWidth={0}
                  dot={false}
                  activeDot={false}
                  legendType="none"
                />
              ))}

              {/* Total consumption – thick solid, same kWh axis as rooms */}
              <Line
                yAxisId="energy"
                type="monotone"
                dataKey="totalEnergy"
                name={t('energy.totalConsumption')}
                stroke="#1e3a5f"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />

              {/* Total cost – solid red, separate axis */}
              <Line
                yAxisId="totalCost"
                type="monotone"
                dataKey="totalCost"
                name={t('energy.cost')}
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />

              {/* Spot price – dashed amber, own c/kWh axis */}
              <Line
                yAxisId="spotPrice"
                type="stepAfter"
                dataKey="spotPriceCents"
                name={t('energy.spotPrice')}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie charts: per-room energy and cost breakdown */}
      {hasData && pieData.energy.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">{t('energy.consumption')} {t('energy.byDevice')}</h3>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData.energy}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                >
                  {pieData.energy.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => fmtEnergy(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">{t('energy.cost')} {t('energy.byDevice')}</h3>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData.cost}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                >
                  {pieData.cost.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => fmtCost(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrapper to pass props to custom tooltip
const CustomTooltipWrapper = (props) => (
  <CustomTooltip {...props} />
);

// ── Sub-components ──

const StatCard = ({ icon, label, value, loading, color }) => {
  const borderMap = { blue: 'border-blue-300', green: 'border-green-300', orange: 'border-orange-300' };
  const textMap = { blue: 'text-blue-600', green: 'text-green-600', orange: 'text-orange-600' };
  return (
    <div className={`bg-white rounded-xl shadow-md p-5 border-l-4 ${borderMap[color] || 'border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${textMap[color] || 'text-gray-800'}`}>
        {loading ? '...' : value}
      </p>
    </div>
  );
};

const ChartSkeleton = () => (
  <div className="flex items-center justify-center h-[400px] bg-gray-50 rounded-lg">
    <div className="animate-pulse flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
      <span className="text-sm text-gray-400">Loading chart data...</span>
    </div>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex items-center justify-center h-[400px] bg-gray-50 rounded-lg">
    <p className="text-gray-400 text-sm">{message}</p>
  </div>
);

export default AdminEnergy;
