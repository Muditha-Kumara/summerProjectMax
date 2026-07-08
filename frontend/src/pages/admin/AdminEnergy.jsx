import React, { useState } from 'react';

const AdminEnergy = () => {
  const [timeRange, setTimeRange] = useState('day');

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Energy Statistics</h1>
      
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
            Day
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              timeRange === 'week'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              timeRange === 'month'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              timeRange === 'year'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Year
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Total Energy Consumption</h4>
            <p className="text-3xl font-bold text-primary-600">-- kWh</p>
            <p className="text-sm text-gray-500 mt-2">This {timeRange}</p>
          </div>

          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Average Spot Price</h4>
            <p className="text-3xl font-bold text-green-600">-- €/kWh</p>
            <p className="text-sm text-gray-500 mt-2">This {timeRange}</p>
          </div>

          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Estimated Cost</h4>
            <p className="text-3xl font-bold text-orange-600">-- €</p>
            <p className="text-sm text-gray-500 mt-2">This {timeRange}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Energy Consumption by Device</h3>
        <p className="text-gray-500">Detailed charts will be implemented in Phase 5 using Recharts</p>
      </div>
    </div>
  );
};

export default AdminEnergy;
