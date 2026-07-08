import React from 'react';

const AdminDashboard = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Room Status Cards */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Room Status</h3>
          <p className="text-gray-500">Room monitoring will be implemented in Phase 5</p>
        </div>

        {/* Control Mode Indicator */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Control Modes</h3>
          <p className="text-gray-500">Control mode indicators will be implemented in Phase 5</p>
        </div>

        {/* Spot Price Schedule */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Spot Price Schedule</h3>
          <p className="text-gray-500">Spot price visualization will be implemented in Phase 5</p>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
        <button className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors">
          Optimize All Rooms
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
