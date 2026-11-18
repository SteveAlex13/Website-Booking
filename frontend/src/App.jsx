import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, matchPath } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';
import RequireSuperAdmin from './components/common/RequireSuperAdmin';
import TopLoadingBar from './components/common/TopLoadingBar';

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
import AdminCouponsPage from './pages/admin/AdminCouponsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

const SITE_NAME = 'The Royal Nusantara';

// Browser tab title for each route. Add one line here for every new page.
const PAGE_TITLES = [
  ['/', 'Beranda'],
  ['/services', 'Kamar & Suite'],
  ['/book/:serviceId', 'Pesan Kamar'],
  ['/payment-result/:paymentId', 'Hasil Pembayaran'],
  ['/login', 'Masuk'],
  ['/register', 'Daftar'],
  ['/customer/dashboard', 'Reservasi Saya'],
  ['/customer/profile', 'Profil Tamu'],
  ['/admin/dashboard', 'Dashboard Hotel'],
  ['/admin/bookings', 'Reservasi & Front Desk'],
  ['/admin/rooms', 'Unit Kamar Fisik'],
  ['/admin/services', 'Tipe Kamar & Suite'],
  ['/admin/categories', 'Layanan Tambahan'],
  ['/admin/coupons', 'Kupon & Promo'],
  ['/admin/schedules', 'Profil Hotel'],
  ['/admin/customers', 'Buku Tamu'],
  ['/admin/users', 'Kelola User'],
  ['/admin/payments', 'Transaksi Pembayaran'],
  ['/admin/reports', 'Laporan Finansial'],
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
          <TopLoadingBar />
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
              {/* Front desk + super admin */}
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="rooms" element={<AdminRoomsPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />

              {/* Super admin only */}
              <Route path="categories" element={<RequireSuperAdmin><AdminCategoriesPage /></RequireSuperAdmin>} />
              <Route path="coupons" element={<RequireSuperAdmin><AdminCouponsPage /></RequireSuperAdmin>} />
              <Route path="services" element={<RequireSuperAdmin><AdminServicesPage /></RequireSuperAdmin>} />
              <Route path="schedules" element={<RequireSuperAdmin><AdminSchedulesPage /></RequireSuperAdmin>} />
              <Route path="users" element={<RequireSuperAdmin><AdminUsersPage /></RequireSuperAdmin>} />
              <Route path="payments" element={<RequireSuperAdmin><AdminPaymentsPage /></RequireSuperAdmin>} />
              <Route path="reports" element={<RequireSuperAdmin><AdminReportsPage /></RequireSuperAdmin>} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
