import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore.js';
import { Loader2 } from 'lucide-react';

// Common pages
import Navbar from './components/Shared/Navbar.jsx';
import Footer from './components/Shared/Footer.jsx';
import Sidebar from './components/Shared/Sidebar.jsx';

import Home from './pages/Common/Home.jsx';
import Login from './pages/Common/Login.jsx';
import Register from './pages/Common/Register.jsx';
import VerifyEmail from './pages/Common/VerifyEmail.jsx';
import ForgotPassword from './pages/Common/ForgotPassword.jsx';
import ResetPassword from './pages/Common/ResetPassword.jsx';
import PaymentSuccess from './pages/Common/PaymentSuccess.jsx';
import DoctorDetails from './pages/Common/DoctorDetails.jsx';
import Unauthorized from './pages/Common/Unauthorized.jsx';
import Chat from './pages/Common/Chat.jsx';

// Patient pages
import PatientDashboard from './pages/Patient/PatientDashboard.jsx';
import PatientProfile from './pages/Patient/PatientProfile.jsx';
import SearchDoctors from './pages/Patient/SearchDoctors.jsx';
import AppointmentHistory from './pages/Patient/AppointmentHistory.jsx';
import MedicalRecords from './pages/Patient/MedicalRecords.jsx';
import MedicineReminders from './pages/Patient/MedicineReminders.jsx';
import Checkout from './pages/Patient/Checkout.jsx';

// Doctor pages
import DoctorDashboard from './pages/Doctor/DoctorDashboard.jsx';
import DoctorProfile from './pages/Doctor/DoctorProfile.jsx';
import ManageSlots from './pages/Doctor/ManageSlots.jsx';

// Admin pages
import AdminDashboard from './pages/Admin/AdminDashboard.jsx';
import ManageDoctors from './pages/Admin/ManageDoctors.jsx';
import ManagePatients from './pages/Admin/ManagePatients.jsx';
import ManageReviews from './pages/Admin/ManageReviews.jsx';
import BroadcastNotifications from './pages/Admin/BroadcastNotifications.jsx';

// Protected Route Guard
function ProtectedRoute({ allowedRoles }) {
  const { user, authChecking, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (authChecking) {
    return (
      <div className="min-h-[90vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

// Layout for general/public pages
function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

// Layout for Dashboard pages (includes Sidebar)
function DashboardLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background dark:bg-background-dark transition-colors">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 p-4">
        <Sidebar />
        <main className="flex-1 p-2 md:p-4 pb-28 md:pb-4 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        
        {/* Public Routes Layout */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/doctors/:id" element={<DoctorDetails />} />
        </Route>

        {/* Public Dashboard Routes (accessible to all logged-in roles and guests) */}
        <Route element={<DashboardLayout />}>
          <Route path="/patient/search" element={<SearchDoctors />} />
        </Route>

        {/* Patient Dashboard Routes */}
        <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path="/patient/profile" element={<PatientProfile />} />
            <Route path="/patient/appointments" element={<AppointmentHistory />} />
            <Route path="/patient/records" element={<MedicalRecords />} />
            <Route path="/patient/reminders" element={<MedicineReminders />} />
            <Route path="/patient/chat" element={<Chat />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
          </Route>
          <Route path="/patient/checkout/:appointmentId" element={<Checkout />} />
        </Route>

        {/* Doctor Dashboard Routes */}
        <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor/profile" element={<DoctorProfile />} />
            <Route path="/doctor/availability" element={<ManageSlots />} />
            <Route path="/doctor/chat" element={<Chat />} />
          </Route>
        </Route>

        {/* Admin Dashboard Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/doctors" element={<ManageDoctors />} />
            <Route path="/admin/patients" element={<ManagePatients />} />
            <Route path="/admin/reviews" element={<ManageReviews />} />
            <Route path="/admin/notifications" element={<BroadcastNotifications />} />
          </Route>
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
}
