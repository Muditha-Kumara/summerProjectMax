import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import roomService from '../../services/roomService';

const AdminRooms = () => {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingRooms, setTogglingRooms] = useState({});
  const [updatingThreshold, setUpdatingThreshold] = useState({});
  const [editingTemp, setEditingTemp] = useState({});
  const [updatingTemp, setUpdatingTemp] = useState({});

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      console.log('Fetching rooms...');
      const data = await roomService.getAll();
      console.log('Rooms fetched:', data);
      setRooms(data.rooms || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
      setError('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRelay = async (roomId, currentState) => {
    console.log('Toggle button clicked:', { roomId, currentState });
    const newState = currentState ? 'off' : 'on';
    console.log('New state:', newState);
    setTogglingRooms(prev => ({ ...prev, [roomId]: true }));
    
    try {
      console.log('Calling toggleRelay API...');
      const result = await roomService.toggleRelay(roomId, newState);
      console.log('Toggle result:', result);
      
      // Update the room state directly instead of refetching
      setRooms(prevRooms => 
        prevRooms.map(room => 
          room.id === roomId 
            ? { ...room, heating_on: result.heating_on }
            : room
        )
      );
      console.log('Rooms state updated');
    } catch (err) {
      console.error('Failed to toggle relay:', err);
      alert('Failed to toggle device. Please try again.');
    } finally {
      setTogglingRooms(prev => ({ ...prev, [roomId]: false }));
    }
  };

  const handleUpdateAlertThreshold = async (roomId, threshold) => {
    setUpdatingThreshold(prev => ({ ...prev, [roomId]: true }));
    
    try {
      await roomService.updateAlertThreshold(roomId, threshold);
      await fetchRooms();
    } catch (err) {
      console.error('Failed to update alert threshold:', err);
      alert('Failed to update alert threshold. Please try again.');
    } finally {
      setUpdatingThreshold(prev => ({ ...prev, [roomId]: false }));
    }
  };

  const handleSaveTargetTemp = async (roomId, newTemp) => {
    setUpdatingTemp(prev => ({ ...prev, [roomId]: true }));
    
    try {
      await roomService.updateTemperature(roomId, parseFloat(newTemp));
      await fetchRooms();
      setEditingTemp(prev => ({ ...prev, [roomId]: false }));
    } catch (err) {
      console.error('Failed to update target temperature:', err);
      alert('Failed to update target temperature. Please try again.');
    } finally {
      setUpdatingTemp(prev => ({ ...prev, [roomId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('admin.rooms.loadingRooms')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{t('admin.rooms.failedToFetch')}</p>
        <button 
          onClick={fetchRooms}
          className="mt-2 text-red-600 underline hover:no-underline"
        >
          {t('admin.rooms.retry')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">{t('admin.rooms.title')}</h1>
      
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{t('admin.rooms.deviceMapping')}</h3>
        <p className="text-gray-500 mb-4">{t('admin.rooms.deviceMappingDesc')}</p>
        
        <div className="space-y-4">
          {rooms.map((room) => (
            <div key={room.id} className="border-2 border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 text-lg">{room.name_fi || room.name}</h4>
                  {room.shelly_device_type && (
                    <p className="text-sm text-gray-600 mt-1">{room.shelly_device_type}</p>
                  )}
                  {room.shelly_device_id && (
                    <p className="text-xs text-gray-500 mt-1">{t('admin.rooms.deviceId')}: {room.shelly_device_id}</p>
                  )}
                </div>
                
                {/* On/Off Toggle Button */}
                {room.shelly_device_id && (
                  <button
                    onClick={() => handleToggleRelay(room.id, room.heating_on)}
                    disabled={togglingRooms[room.id]}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                      room.heating_on
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {togglingRooms[room.id] ? t('admin.rooms.toggling') : room.heating_on ? t('admin.rooms.turnOff') : t('admin.rooms.turnOn')}
                  </button>
                )}
              </div>

              {/* Temperature and Status Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {room.current_temp !== null && (
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500">{t('admin.rooms.currentTemp')}</p>
                    <p className="text-lg font-semibold text-gray-800">{room.current_temp}°C</p>
                  </div>
                )}
                {room.target_temp !== null && (
                  <div className="bg-gray-50 rounded p-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">{t('admin.rooms.targetTemp')}</p>
                      {!editingTemp[room.id] && (
                        <button
                          onClick={() => setEditingTemp(prev => ({ ...prev, [room.id]: true }))}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {t('admin.rooms.edit')}
                        </button>
                      )}
                    </div>
                    {editingTemp[room.id] ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          step="0.5"
                          min={room.min_temp || 5}
                          max={room.max_temp || 65}
                          defaultValue={room.target_temp}
                          className="w-24 px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveTargetTemp(room.id, e.target.value);
                            } else if (e.key === 'Escape') {
                              setEditingTemp(prev => ({ ...prev, [room.id]: false }));
                            }
                          }}
                          disabled={updatingTemp[room.id]}
                        />
                        <button
                          onClick={(e) => {
                            const input = e.target.parentElement.querySelector('input');
                            handleSaveTargetTemp(room.id, input.value);
                          }}
                          disabled={updatingTemp[room.id]}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                          {updatingTemp[room.id] ? '…' : '✓'}
                        </button>
                        <button
                          onClick={() => setEditingTemp(prev => ({ ...prev, [room.id]: false }))}
                          disabled={updatingTemp[room.id]}
                          className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <p className="text-lg font-semibold text-gray-800">{room.target_temp}°C</p>
                    )}
                  </div>
                )}
                {room.humidity !== null && (
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500">{t('admin.rooms.humidity')}</p>
                    <p className="text-lg font-semibold text-gray-800">{room.humidity}%</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">{t('admin.rooms.statusLabel')}</p>
                  <p className={`text-sm font-semibold ${
                    !room.device_online 
                      ? 'text-red-600' 
                      : room.heating_on 
                        ? 'text-orange-600' 
                        : 'text-blue-600'
                  }`}>
                    {!room.device_online 
                      ? t('admin.rooms.offline') 
                      : room.heating_on 
                        ? t('admin.rooms.heating') 
                        : t('admin.rooms.off')}
                  </p>
                </div>
              </div>

              {/* Alert Threshold Selector */}
              <div className="border-t pt-3 mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.rooms.alertThreshold')}
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={room.alert_threshold ? parseFloat(room.alert_threshold).toString() : ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : null;
                      handleUpdateAlertThreshold(room.id, value);
                    }}
                    disabled={updatingThreshold[room.id]}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">{t('admin.rooms.noAlert')}</option>
                    <option value="5">{t('admin.rooms.freezeWarning')}</option>
                    <option value="10">{t('admin.rooms.lowTemp')}</option>
                    <option value="15">{t('admin.rooms.coolWarning')}</option>
                    <option value="20">{t('admin.rooms.roomTemp')}</option>
                    <option value="25">{t('admin.rooms.warmWarning')}</option>
                    <option value="30">{t('admin.rooms.highTemp')}</option>
                  </select>
                  {updatingThreshold[room.id] && (
                    <span className="text-sm text-gray-500">{t('admin.rooms.updating')}</span>
                  )}
                </div>
                {room.alert_threshold && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('admin.rooms.alertWillTrigger')} {parseFloat(room.alert_threshold).toFixed(2)}°C
                  </p>
                )}
              </div>

              {/* Critical Room Warning */}
              {room.is_critical && room.critical_min_temp && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-600 font-semibold">
                    {t('admin.rooms.criticalWarning')} {room.critical_min_temp}°C
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminRooms;
