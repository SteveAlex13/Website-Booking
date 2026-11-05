import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, matchPath } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';

// Public & Auth Pages
import HomePage from './pages/public/HomePage';
import ServicesPage from './pages/public/ServicesPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Booking & Customer Pages
import BookingFlowPage from './pages/customer/BookingFlowPage';
import PaymentResultPage from './pages/customer/PaymentResultPage';
import CustomerDashboardPage from './pages/customer/CustomerDashboardPage';
import CustomerProfilePage from './pages/customer/CustomerProfilePage';

// Admin Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminServicesPage from './pages/admin/AdminServicesPage';
import AdminRoomsPage from './pages/admin/AdminRoomsPage';
import AdminSchedulesPage from './pages/admin/AdminSchedulesPage';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminCustomersPage from './pages/admin/AdminCustomersPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';

const SITE_NAME = 'The Royal Nusantara';

// Browser tab title for each route. Add new pages here.
const PAGE_TITLES = [
  ['/', 'Beranda'],
  ['/services', 'Kamar & Suite'],
  ['/book/:serviceId', 'Pesan Kamar'],
  ['/payment-result/:paymentId', 'Hasil Pembayaran'],
  ['/login', 'Masuk'],
  ['/register', 'Daftar'],
  ['/customer/dashboard', 'Reservasi Saya'],
  ['/customer/profile', 'Profil Tamu'],
  ['/admin/dashboard', 'Dashboard Admin'],
  ['/admin/rooms', 'Unit Kamar'],
  ['/admin/categories', 'Layanan Tambahan'],
  ['/admin/services', 'Tipe Kamar'],
  ['/admin/schedules', 'Profil Hotel'],
  ['/admin/bookings', 'Front Desk & Reservasi'],
  ['/admin/customers', 'Data Pelanggan'],
  ['/admin/payments', 'Pembayaran'],
  ['/admin/reports', 'Laporan'],
];

function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const match = PAGE_TITLES.find(([path]) => matchPath({ path, end: true }, pathname));
    document.title = match ? `${match[1]} | ${SITE_NAME}` : SITE_NAME;
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <DocumentTitle />
          <Routes>
            {/* Public Website */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/book/:serviceId" element={<BookingFlowPage />} />
              <Route path="/payment-result/:paymentId" element={<PaymentResultPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Customer Area */}
            <Route path="/customer" element={<CustomerLayout />}>
              <Route path="dashboard" element={<CustomerDashboardPage />} />
              <Route path="profile" element={<CustomerProfilePage />} />
            </Route>

            {/* Admin Area */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="rooms" element={<AdminRoomsPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="services" element={<AdminServicesPage />} />
              <Route path="schedules" element={<AdminSchedulesPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
