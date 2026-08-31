import React, { useState, useEffect } from 'react';
import roomService from '../../services/roomService';

const AdminRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingRooms, setTogglingRooms] = useState({});
  const [updatingThreshold, setUpdatingThreshold] = useState({});

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await roomService.getAll();
      setRooms(data.rooms || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch rooms');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRelay = async (roomId, currentState) => {
    const newState = currentState ? 'off' : 'on';
    setTogglingRooms(prev => ({ ...prev, [roomId]: true }));
    
    try {
      await roomService.toggleRelay(roomId, newState);
      // Refresh rooms to get updated state
      await fetchRooms();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading rooms...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchRooms}
          className="mt-2 text-red-600 underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Room Management</h1>
      
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Device Mapping</h3>
        <p className="text-gray-500 mb-4">Map Shelly devices to rooms and configure thermal capacity settings.</p>
        
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
                    <p className="text-xs text-gray-500 mt-1">Device ID: {room.shelly_device_id}</p>
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
                    {togglingRooms[room.id] ? 'Toggling...' : room.heating_on ? 'Turn OFF' : 'Turn ON'}
                  </button>
                )}
              </div>

              {/* Temperature and Status Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {room.current_temp !== null && (
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500">Current Temp</p>
                    <p className="text-lg font-semibold text-gray-800">{room.current_temp}°C</p>
                  </div>
                )}
                {room.target_temp !== null && (
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500">Target Temp</p>
                    <p className="text-lg font-semibold text-gray-800">{room.target_temp}°C</p>
                  </div>
                )}
                {room.humidity !== null && (
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500">Humidity</p>
                    <p className="text-lg font-semibold text-gray-800">{room.humidity}%</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className={`text-sm font-semibold ${room.device_online ? 'text-green-600' : 'text-red-600'}`}>
                    {room.device_online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>

              {/* Alert Threshold Selector */}
              <div className="border-t pt-3 mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Threshold (°C)
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
                    <option value="">No alert threshold</option>
                    <option value="5">5°C - Freeze warning</option>
                    <option value="10">10°C - Low temperature</option>
                    <option value="15">15°C - Cool warning</option>
                    <option value="20">20°C - Room temperature</option>
                    <option value="25">25°C - Warm warning</option>
                    <option value="30">30°C - High temperature</option>
                  </select>
                  {updatingThreshold[room.id] && (
                    <span className="text-sm text-gray-500">Updating...</span>
                  )}
                </div>
                {room.alert_threshold && (
                  <p className="text-xs text-gray-500 mt-1">
                    Alert will trigger when temperature drops below {parseFloat(room.alert_threshold).toFixed(2)}°C
                  </p>
                )}
              </div>

              {/* Critical Room Warning */}
              {room.is_critical && room.critical_min_temp && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-600 font-semibold">
                    ⚠️ Critical: Never drop below {room.critical_min_temp}°C
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
