import React, { useState, useEffect } from 'react';
import api from '../api';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('apiKeys');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('apiKeys')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'apiKeys'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            API Keys
          </button>
          <button
            onClick={() => setActiveTab('deviceMapping')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'deviceMapping'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Device Mapping
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'apiKeys' && <ApiKeysTab />}
      {activeTab === 'deviceMapping' && <DeviceMappingTab />}
    </div>
  );
}

/* ───────── API Keys Tab ───────── */
function ApiKeysTab() {
  const [keys, setKeys] = useState({
    shelly: '',
    nordPool: '',
    openWeather: '',
    openai: '',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const { data } = await api.get('/api/settings/keys');
      setKeys(data);
    } catch (err) {
      console.error('Failed to load API keys', err);
    }
  };

  const handleChange = (e) => {
    setKeys({ ...keys, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await api.put('/api/settings/keys', keys);
      setMessage('API keys updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update API keys');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">API Credentials</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>
      )}
      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">
          {message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shelly API Key
            </label>
            <input
              type="password"
              name="shelly"
              value={keys.shelly}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nord Pool API Key
            </label>
            <input
              type="password"
              name="nordPool"
              value={keys.nordPool}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OpenWeather API Key
            </label>
            <input
              type="password"
              name="openWeather"
              value={keys.openWeather}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OpenAI API Key
            </label>
            <input
              type="password"
              name="openai"
              value={keys.openai}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">SMTP Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMTP Host
              </label>
              <input
                type="text"
                name="smtpHost"
                value={keys.smtpHost}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMTP Port
              </label>
              <input
                type="text"
                name="smtpPort"
                value={keys.smtpPort}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMTP Username
              </label>
              <input
                type="text"
                name="smtpUser"
                value={keys.smtpUser}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMTP Password
              </label>
              <input
                type="password"
                name="smtpPass"
                value={keys.smtpPass}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {loading ? 'Saving...' : 'Save API Keys'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ───────── Device Mapping Tab ───────── */
function DeviceMappingTab() {
  const [rooms, setRooms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [roomsRes, devicesRes] = await Promise.all([
        api.get('/api/admin/rooms'),
        api.get('/api/admin/devices'),
      ]);
      setRooms(roomsRes.data);
      setDevices(devicesRes.data);
    } catch (err) {
      setError('Failed to load rooms and devices');
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceChange = (roomId, deviceId) => {
    setRooms(
      rooms.map((r) =>
        (r._id || r.id) === roomId ? { ...r, shellyDeviceId: deviceId } : r
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const mappings = rooms.map((r) => ({
        roomId: r._id || r.id,
        shellyDeviceId: r.shellyDeviceId || '',
      }));
      await api.put('/api/settings/mapping', { mappings });
      setMessage('Device mappings updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update mappings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading rooms and devices...</p>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Device Mapping</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {saving ? 'Saving...' : 'Save Mappings'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>
      )}
      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">
          {message}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Room Name
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Shelly Device
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">
                Thermal Capacity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                  No rooms found.
                </td>
              </tr>
            ) : (
              rooms.map((room) => (
                <tr key={room._id || room.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {room.name}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={room.shellyDeviceId || ''}
                      onChange={(e) =>
                        handleDeviceChange(room._id || room.id, e.target.value)
                      }
                      className="w-full max-w-xs px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select Device --</option>
                      {devices.map((dev) => (
                        <option key={dev._id || dev.id} value={dev._id || dev.id}>
                          {dev.name} ({dev.deviceId})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {room.thermalCapacity ? `${room.thermalCapacity} W/°C` : '--'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

</parameter name=\"contents\">\n\n</ARG>\"