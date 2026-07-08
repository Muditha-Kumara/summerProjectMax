import React from 'react';

const AdminRooms = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Room Management</h1>
      
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Device Mapping</h3>
        <p className="text-gray-500 mb-4">Map Shelly devices to rooms and configure thermal capacity settings.</p>
        
        <div className="space-y-4">
          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800">Kodinhoitohuone (Utility Room)</h4>
            <p className="text-sm text-gray-600">Shelly Plus 1PM + Add-on + DS18B20</p>
            <p className="text-sm text-red-600 font-semibold mt-2">⚠️ Critical: Never drop below 15°C</p>
          </div>

          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800">Eteinen (Hallway)</h4>
            <p className="text-sm text-gray-600">Shelly Plus 1PM + Add-on + DS18B20</p>
          </div>

          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800">Makuuhuone (Bedroom)</h4>
            <p className="text-sm text-gray-600">Shelly Plus 1PM + Add-on + DS18B20</p>
          </div>

          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800">Olohuone (Living Room)</h4>
            <p className="text-sm text-gray-600">Shelly Plus 1PM</p>
          </div>

          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800">Varasto (Storage)</h4>
            <p className="text-sm text-gray-600">Shelly Plus 1PM</p>
          </div>

          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800">Lämminvesivaraaja (Water Heater)</h4>
            <p className="text-sm text-gray-600">Shelly Pro 4PM (heavy-duty contactor)</p>
          </div>

          <div className="border-2 border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800">Ilmalämpöpumppu (Heat Pump)</h4>
            <p className="text-sm text-gray-600">Shelly Pro 1PM</p>
            <p className="text-sm text-red-600 font-semibold mt-2">⚠️ Critical: Keep drain active when outdoor temp &lt; 0°C</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRooms;
