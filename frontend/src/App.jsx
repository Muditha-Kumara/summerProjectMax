import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Guest Pages
import UserLogin from './pages/guest/UserLogin';
import GuestDashboard from './pages/guest/GuestDashboard';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRooms from './pages/admin/AdminRooms';
import AdminBookings from './pages/admin/AdminBookings';
import AdminSettings from './pages/admin/AdminSettings';
import AdminEnergy from './pages/admin/AdminEnergy';

// Layouts
import GuestLayout from './components/guest/GuestLayout';
import AdminLayout from './components/admin/AdminLayout';

// Protected Route wrapper
const ProtectedAdminRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/admin" replace />;
  }
  return children;
};

const ProtectedUserRoute = ({ children }) => {
  const token = localStorage.getItem('userToken');
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <>
      <Routes>
        {/* Default route - Guest/User */}
        <Route path="/" element={<GuestLayout />}>
          <Route index element={<UserLogin />} />
          <Route 
            path="dashboard" 
            element={
              <ProtectedUserRoute>
                <GuestDashboard />
              </ProtectedUserRoute>
            } 
          />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminLogin />} />
          <Route 
            path="dashboard" 
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            } 
          />
          <Route 
            path="rooms" 
            element={
              <ProtectedAdminRoute>
                <AdminRooms />
              </ProtectedAdminRoute>
            } 
          />
          <Route 
            path="bookings" 
            element={
              <ProtectedAdminRoute>
                <AdminBookings />
              </ProtectedAdminRoute>
            } 
          />
          <Route 
            path="energy" 
            element={
              <ProtectedAdminRoute>
                <AdminEnergy />
              </ProtectedAdminRoute>
            } 
          />
          <Route 
            path="settings" 
            element={
              <ProtectedAdminRoute>
                <AdminSettings />
              </ProtectedAdminRoute>
            } 
          />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer 
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{ fontSize: '1.25rem' }}
      />
    </>
  );
}

export default App;
