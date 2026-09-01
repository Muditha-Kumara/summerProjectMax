import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

export default function AdminSettings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('apiKeys');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('admin.settings.title')}</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('apiKeys')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'apiKeys'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('admin.settings.apiKeys')}
          </button>
          <button
            onClick={() => setActiveTab('deviceMapping')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'deviceMapping'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('admin.settings.deviceMapping')}
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'system'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('admin.settings.system')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'apiKeys' && <ApiKeysTab />}
      {activeTab === 'deviceMapping' && <DeviceMappingTab />}
      {activeTab === 'system' && <SystemSettingsTab />}
    </div>
  );
}

/* ───────── Section Wrapper Component ───────── */
function SettingsSection({ title, children, onSave, onTest, saveLabel, testLabel, saving = false, testing = false, message = '', error = '' }) {
  const { t } = useTranslation();
  return (
    <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <div className="flex gap-2">
          {onTest && (
            <button
              type="button"
              onClick={onTest}
              disabled={testing}
              className="px-4 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {testing ? t('admin.settings.testing') : testLabel || t('admin.settings.test')}
            </button>
          )}
          {onSave && (
            <button
              type="submit"
              onClick={onSave}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? t('admin.settings.saving') : saveLabel || t('admin.settings.save')}
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="mb-3 p-2.5 bg-red-100 text-red-700 rounded text-xs">{error}</div>
      )}
      {message && (
        <div className="mb-3 p-2.5 bg-green-100 text-green-700 rounded text-xs">{message}</div>
      )}
      {children}
    </div>
  );
}

/* ───────── API Keys Tab ───────── */
function ApiKeysTab() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState({
    shelly: '',
    shellyServerId: '',
    nordPool: '',
    nordPoolArea: 'FI',
    openWeather: '',
    openWeatherLat: '60.1699',
    openWeatherLon: '24.9384',
    openWeatherUnits: 'metric',
    openai: '',
    aiModel: 'qwen-plus',
    aiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    smtpHost: '',
    smtpPort: '587',
    smtpSecure: 'false',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
  });

  // Per-section state
  const [shellyState, setShellyState] = useState({ saving: false, testing: false, message: '', error: '' });
  const [nordPoolState, setNordPoolState] = useState({ saving: false, testing: false, message: '', error: '' });
  const [weatherState, setWeatherState] = useState({ saving: false, testing: false, message: '', error: '' });
  const [aiState, setAiState] = useState({ saving: false, testing: false, message: '', error: '' });
  const [smtpState, setSmtpState] = useState({ saving: false, testing: false, message: '', error: '' });

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const { data } = await api.get('/settings/keys');
      setKeys(data);
    } catch (err) {
      console.error('Failed to load API keys', err);
    }
  };

  const handleChange = (e) => {
    setKeys({ ...keys, [e.target.name]: e.target.value });
  };

  const clearMessage = (setState) => {
    setTimeout(() => setState(prev => ({ ...prev, message: '', error: '' })), 3000);
  };

  // Shelly handlers
  const saveShelly = async () => {
    setShellyState(prev => ({ ...prev, saving: true, message: '', error: '' }));
    try {
      await api.put('/settings/keys', { ...keys, shelly: keys.shelly, shellyServerId: keys.shellyServerId });
      setShellyState(prev => ({ ...prev, saving: false, message: 'Shelly settings saved' }));
      clearMessage(setShellyState);
    } catch (err) {
      setShellyState(prev => ({ ...prev, saving: false, error: err.response?.data?.message || 'Failed to save' }));
    }
  };

  const testShelly = async () => {
    setShellyState(prev => ({ ...prev, testing: true, message: '', error: '' }));
    try {
      const { data } = await api.post('/settings/test-shelly');
      setShellyState(prev => ({ ...prev, testing: false, message: data.message }));
      clearMessage(setShellyState);
    } catch (err) {
      setShellyState(prev => ({ ...prev, testing: false, error: err.response?.data?.message || 'Test failed' }));
    }
  };

  // Nord Pool handlers
  const saveNordPool = async () => {
    setNordPoolState(prev => ({ ...prev, saving: true, message: '', error: '' }));
    try {
      await api.put('/settings/keys', { ...keys, nordPool: keys.nordPool, nordPoolArea: keys.nordPoolArea });
      setNordPoolState(prev => ({ ...prev, saving: false, message: 'Nord Pool settings saved' }));
      clearMessage(setNordPoolState);
    } catch (err) {
      setNordPoolState(prev => ({ ...prev, saving: false, error: err.response?.data?.message || 'Failed to save' }));
    }
  };

  const testNordPool = async () => {
    setNordPoolState(prev => ({ ...prev, testing: true, message: '', error: '' }));
    try {
      const { data } = await api.post('/settings/test-nordpool');
      setNordPoolState(prev => ({ ...prev, testing: false, message: data.message }));
      clearMessage(setNordPoolState);
    } catch (err) {
      setNordPoolState(prev => ({ ...prev, testing: false, error: err.response?.data?.message || 'Test failed' }));
    }
  };

  // Weather handlers
  const saveWeather = async () => {
    setWeatherState(prev => ({ ...prev, saving: true, message: '', error: '' }));
    try {
      await api.put('/settings/keys', { 
        ...keys, 
        openWeather: keys.openWeather, 
        openWeatherLat: keys.openWeatherLat,
        openWeatherLon: keys.openWeatherLon,
        openWeatherUnits: keys.openWeatherUnits
      });
      setWeatherState(prev => ({ ...prev, saving: false, message: 'Weather settings saved' }));
      clearMessage(setWeatherState);
    } catch (err) {
      setWeatherState(prev => ({ ...prev, saving: false, error: err.response?.data?.message || 'Failed to save' }));
    }
  };

  const testWeather = async () => {
    setWeatherState(prev => ({ ...prev, testing: true, message: '', error: '' }));
    try {
      const { data } = await api.post('/settings/test-weather');
      setWeatherState(prev => ({ ...prev, testing: false, message: data.message }));
      clearMessage(setWeatherState);
    } catch (err) {
      setWeatherState(prev => ({ ...prev, testing: false, error: err.response?.data?.message || 'Test failed' }));
    }
  };

  // AI handlers
  const saveAI = async () => {
    setAiState(prev => ({ ...prev, saving: true, message: '', error: '' }));
    try {
      await api.put('/settings/keys', { 
        ...keys, 
        openai: keys.openai,
        aiModel: keys.aiModel,
        aiEndpoint: keys.aiEndpoint
      });
      setAiState(prev => ({ ...prev, saving: false, message: 'AI settings saved' }));
      clearMessage(setAiState);
    } catch (err) {
      setAiState(prev => ({ ...prev, saving: false, error: err.response?.data?.message || 'Failed to save' }));
    }
  };

  const testAI = async () => {
    setAiState(prev => ({ ...prev, testing: true, message: '', error: '' }));
    try {
      const { data } = await api.post('/settings/test-ai');
      setAiState(prev => ({ ...prev, testing: false, message: data.message }));
      clearMessage(setAiState);
    } catch (err) {
      setAiState(prev => ({ ...prev, testing: false, error: err.response?.data?.message || 'Test failed' }));
    }
  };

  // SMTP handlers
  const saveSMTP = async () => {
    setSmtpState(prev => ({ ...prev, saving: true, message: '', error: '' }));
    try {
      await api.put('/settings/keys', { 
        ...keys, 
        smtpHost: keys.smtpHost,
        smtpPort: keys.smtpPort,
        smtpSecure: keys.smtpSecure,
        smtpUser: keys.smtpUser,
        smtpPass: keys.smtpPass,
        smtpFrom: keys.smtpFrom
      });
      setSmtpState(prev => ({ ...prev, saving: false, message: 'SMTP settings saved' }));
      clearMessage(setSmtpState);
    } catch (err) {
      setSmtpState(prev => ({ ...prev, saving: false, error: err.response?.data?.message || 'Failed to save' }));
    }
  };

  const testSMTP = async () => {
    setSmtpState(prev => ({ ...prev, testing: true, message: '', error: '' }));
    try {
      const { data } = await api.post('/settings/test-email');
      setSmtpState(prev => ({ ...prev, testing: false, message: data.message }));
      clearMessage(setSmtpState);
    } catch (err) {
      setSmtpState(prev => ({ ...prev, testing: false, error: err.response?.data?.message || 'Test failed' }));
    }
  };

  return (
    <div className="space-y-5">
      {/* Shelly Cloud */}
      <SettingsSection
        title={t('admin.settings.shellyCloud')}
        onSave={saveShelly}
        onTest={testShelly}
        saving={shellyState.saving}
        testing={shellyState.testing}
        message={shellyState.message}
        error={shellyState.error}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.shellyAuthKey')}
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
              {t('admin.settings.shellyServerId')}
            </label>
            <input
              type="text"
              name="shellyServerId"
              value={keys.shellyServerId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </SettingsSection>

      {/* Nord Pool */}
      <SettingsSection
        title={t('admin.settings.nordPool')}
        onSave={saveNordPool}
        onTest={testNordPool}
        saving={nordPoolState.saving}
        testing={nordPoolState.testing}
        message={nordPoolState.message}
        error={nordPoolState.error}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.nordPoolApiKey')}
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
              {t('admin.settings.priceArea')}
            </label>
            <select
              name="nordPoolArea"
              value={keys.nordPoolArea}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="FI">Finland (FI)</option>
              <option value="NO">Norway (NO)</option>
              <option value="SE">Sweden (SE)</option>
              <option value="DK">Denmark (DK)</option>
              <option value="EE">Estonia (EE)</option>
              <option value="LV">Latvia (LV)</option>
              <option value="LT">Lithuania (LT)</option>
            </select>
          </div>
        </div>
      </SettingsSection>

      {/* OpenWeather */}
      <SettingsSection
        title={t('admin.settings.openWeather')}
        onSave={saveWeather}
        onTest={testWeather}
        saving={weatherState.saving}
        testing={weatherState.testing}
        message={weatherState.message}
        error={weatherState.error}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.apiKey')}
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
              {t('admin.settings.units')}
            </label>
            <select
              name="openWeatherUnits"
              value={keys.openWeatherUnits}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="metric">{t('admin.settings.metric')}</option>
              <option value="imperial">{t('admin.settings.imperial')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.latitude')}
            </label>
            <input
              type="text"
              name="openWeatherLat"
              value={keys.openWeatherLat}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.longitude')}
            </label>
            <input
              type="text"
              name="openWeatherLon"
              value={keys.openWeatherLon}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </SettingsSection>

      {/* AI Configuration */}
      <SettingsSection
        title={t('admin.settings.aiVoice')}
        onSave={saveAI}
        onTest={testAI}
        saving={aiState.saving}
        testing={aiState.testing}
        message={aiState.message}
        error={aiState.error}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.aiEndpoint')}
            </label>
            <input
              type="text"
              name="aiEndpoint"
              value={keys.aiEndpoint}
              onChange={handleChange}
              placeholder={t('admin.settings.aiEndpointPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('admin.settings.aiEndpointHelp')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.aiApiKey')}
            </label>
            <input
              type="password"
              name="openai"
              value={keys.openai}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('admin.settings.aiApiKeyHelp')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.aiModel')}
            </label>
            <select
              name="aiModel"
              value={keys.aiModel}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="qwen3.7-plus">Qwen 3.7 Plus (Better Quality)</option>
              <option value="qwen3.7-max">Qwen 3.7 Max (Best Quality)</option>
              <option value="qwen3.7-flash">Qwen 3.7 Flash (Fastest)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {t('admin.settings.aiModelHelp')}
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* SMTP Configuration */}
      <SettingsSection
        title={t('admin.settings.emailSmtp')}
        onSave={saveSMTP}
        onTest={testSMTP}
        saveLabel={t('admin.settings.saveSmtp')}
        testLabel={t('admin.settings.testEmail')}
        saving={smtpState.saving}
        testing={smtpState.testing}
        message={smtpState.message}
        error={smtpState.error}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.smtpHost')}
            </label>
            <input
              type="text"
              name="smtpHost"
              value={keys.smtpHost}
              onChange={handleChange}
              placeholder="smtp.gmail.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.smtpPort')}
            </label>
            <input
              type="text"
              name="smtpPort"
              value={keys.smtpPort}
              onChange={handleChange}
              placeholder="587"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.useSsl')}
            </label>
            <select
              name="smtpSecure"
              value={keys.smtpSecure}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="false">{t('admin.settings.no')}</option>
              <option value="true">{t('admin.settings.yes')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.fromEmail')}
            </label>
            <input
              type="email"
              name="smtpFrom"
              value={keys.smtpFrom}
              onChange={handleChange}
              placeholder="noreply@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.smtpUsername')}
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
              {t('admin.settings.smtpPassword')}
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
      </SettingsSection>
    </div>
  );
}

/* ───────── Device Mapping Tab ───────── */
function DeviceMappingTab() {
  const { t } = useTranslation();
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
        api.get('/settings/mapping'),
        api.get('/admin/devices'),
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
      await api.put('/settings/mapping', { mappings });
      setMessage('Device mappings updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update mappings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">{t('admin.settings.loadingRoomsDevices')}</p>;
  }

  return (
    <SettingsSection
      title={t('admin.settings.deviceMapping')}
      onSave={handleSave}
      saving={saving}
      message={message}
      error={error}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 font-semibold text-gray-700 text-xs">
                {t('admin.settings.roomName')}
              </th>
              <th className="text-left px-4 py-2 font-semibold text-gray-700 text-xs">
                {t('admin.settings.shellyDevice')}
              </th>
              <th className="text-left px-4 py-2 font-semibold text-gray-700 text-xs">
                {t('admin.settings.thermalCapacity')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-500 text-sm">
                  {t('admin.settings.noRoomsFound')}
                </td>
              </tr>
            ) : (
              rooms.map((room) => (
                <tr key={room._id || room.id} className="hover:bg-gray-100">
                  <td className="px-4 py-2 font-medium text-gray-900 text-sm">
                    {room.name}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={room.shellyDeviceId || ''}
                      onChange={(e) =>
                        handleDeviceChange(room._id || room.id, e.target.value)
                      }
                      className="w-full max-w-xs px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('admin.settings.selectDevice')}</option>
                      {devices.map((dev) => (
                        <option key={dev._id || dev.id} value={dev._id || dev.id}>
                          {dev.name} ({dev.deviceId})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-gray-600 text-sm">
                    {room.thermalCapacity ? `${room.thermalCapacity} W/°C` : '--'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </SettingsSection>
  );
}

/* ───────── System Settings Tab ───────── */
function SystemSettingsTab() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    timezone: 'Europe/Helsinki',
    language: 'en',
    currency: 'EUR',
    temperatureUnit: 'celsius',
    priceThreshold: '0',
    ecoModeEnabled: 'true',
    notificationsEnabled: 'true',
  });
  const [generalState, setGeneralState] = useState({ saving: false, message: '', error: '' });
  const [optimizationState, setOptimizationState] = useState({ saving: false, message: '', error: '' });
  const [notificationsState, setNotificationsState] = useState({ saving: false, message: '', error: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings/system');
      setSettings(data);
    } catch (err) {
      console.error('Failed to load system settings', err);
    }
  };

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const clearMessage = (setState) => {
    setTimeout(() => setState(prev => ({ ...prev, message: '', error: '' })), 3000);
  };

  const saveGeneral = async () => {
    setGeneralState({ saving: true, message: '', error: '' });
    try {
      await api.put('/settings/system', {
        timezone: settings.timezone,
        language: settings.language,
        currency: settings.currency,
        temperatureUnit: settings.temperatureUnit,
      });
      setGeneralState({ saving: false, message: t('admin.settings.generalSettingsSaved') });
      clearMessage(setGeneralState);
    } catch (err) {
      setGeneralState({ saving: false, error: err.response?.data?.message || t('admin.settings.failedToSave') });
    }
  };

  const saveOptimization = async () => {
    setOptimizationState({ saving: true, message: '', error: '' });
    try {
      await api.put('/settings/system', {
        priceThreshold: settings.priceThreshold,
        ecoModeEnabled: settings.ecoModeEnabled,
      });
      setOptimizationState({ saving: false, message: t('admin.settings.optimizationSettingsSaved') });
      clearMessage(setOptimizationState);
    } catch (err) {
      setOptimizationState({ saving: false, error: err.response?.data?.message || t('admin.settings.failedToSave') });
    }
  };

  const saveNotifications = async () => {
    setNotificationsState({ saving: true, message: '', error: '' });
    try {
      await api.put('/settings/system', {
        notificationsEnabled: settings.notificationsEnabled,
      });
      setNotificationsState({ saving: false, message: t('admin.settings.notificationSettingsSaved') });
      clearMessage(setNotificationsState);
    } catch (err) {
      setNotificationsState({ saving: false, error: err.response?.data?.message || t('admin.settings.failedToSave') });
    }
  };

  return (
    <div className="space-y-5">
      {/* General Settings */}
      <SettingsSection
        title={t('admin.settings.general')}
        onSave={saveGeneral}
        saving={generalState.saving}
        message={generalState.message}
        error={generalState.error}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.timezone')}
            </label>
            <select
              name="timezone"
              value={settings.timezone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Europe/Helsinki">Europe/Helsinki (EET/EEST)</option>
              <option value="Europe/Stockholm">Europe/Stockholm (CET/CEST)</option>
              <option value="Europe/Oslo">Europe/Oslo (CET/CEST)</option>
              <option value="Europe/Copenhagen">Europe/Copenhagen (CET/CEST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.languageLabel')}
            </label>
            <select
              name="language"
              value={settings.language}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="fi">Finnish (Suomi)</option>
              <option value="sv">Swedish (Svenska)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.currency')}
            </label>
            <select
              name="currency"
              value={settings.currency}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EUR">Euro (€)</option>
              <option value="SEK">Swedish Krona (kr)</option>
              <option value="NOK">Norwegian Krone (kr)</option>
              <option value="DKK">Danish Krone (kr)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.tempUnit')}
            </label>
            <select
              name="temperatureUnit"
              value={settings.temperatureUnit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="celsius">{t('admin.settings.celsius')} (°C)</option>
              <option value="fahrenheit">{t('admin.settings.fahrenheit')} (°F)</option>
            </select>
          </div>
        </div>
      </SettingsSection>

      {/* Optimization Settings */}
      <SettingsSection
        title={t('admin.settings.optimization')}
        onSave={saveOptimization}
        saving={optimizationState.saving}
        message={optimizationState.message}
        error={optimizationState.error}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.priceThreshold')} (€/kWh)
            </label>
            <input
              type="number"
              step="0.01"
              name="priceThreshold"
              value={settings.priceThreshold}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('admin.settings.priceThresholdHelp')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.ecoMode')}
            </label>
            <select
              name="ecoModeEnabled"
              value={settings.ecoModeEnabled}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="true">{t('admin.settings.enabled')}</option>
              <option value="false">{t('admin.settings.disabled')}</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {t('admin.settings.ecoModeHelp')}
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        title={t('admin.settings.notifications')}
        onSave={saveNotifications}
        saving={notificationsState.saving}
        message={notificationsState.message}
        error={notificationsState.error}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.settings.notificationsEnabled')}
            </label>
            <select
              name="notificationsEnabled"
              value={settings.notificationsEnabled}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="true">{t('admin.settings.enabled')}</option>
              <option value="false">{t('admin.settings.disabled')}</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {t('admin.settings.notificationsHelp')}
            </p>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
