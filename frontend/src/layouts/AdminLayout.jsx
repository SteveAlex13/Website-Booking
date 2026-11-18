import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { adminService } from '../services/adminService';
import { useToast } from '../contexts/ToastContext';
import {
  LayoutDashboard,
  BedDouble,
  DoorOpen,
  Coffee,
  BookOpenCheck,
  Users,
  CreditCard,
  BarChart3,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Shield,
  Hotel,
  Key,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  TicketPercent,
  UserCog,
} from 'lucide-react';

export default function AdminLayout() {
  const { user, isAuthenticated, isAdmin, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  // Super Admin Cancellation Key Modal State
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [cancellationKey, setCancellationKey] = useState('');
  const [loadingKey, setLoadingKey] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const openKeyModal = async () => {
    setKeyModalOpen(true);
    setLoadingKey(true);
    try {
      const res = await adminService.getCancellationKey();
      const key = res.data?.cancellation_key || res.data?.data?.cancellation_key || res.cancellation_key;
      if (key) {
        setCancellationKey(key);
      }
    } catch (err) {
      toast.error('Gagal memuat key otorisasi pembatalan.');
    } finally {
      setLoadingKey(false);
    }
  };

  const handleGenerateNewKey = async () => {
    setGeneratingKey(true);
    try {
      const res = await adminService.generateCancellationKey();
      const key = res.data?.cancellation_key || res.data?.data?.cancellation_key || res.cancellation_key;
      if (key) {
        setCancellationKey(key);
        toast.success('Key otorisasi pembatalan baru berhasil digenerate!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal generate key pembatalan.');
    } finally {
      setGeneratingKey(false);
    }
  };

  const copyKey = () => {
    if (!cancellationKey) return;
    navigator.clipboard.writeText(cancellationKey);
    setCopiedKey(true);
    toast.info('Key konfirmasi pembatalan disalin ke clipboard!');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Front desk (role "admin") only sees the items without superAdminOnly.
  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard Hotel', icon: LayoutDashboard, end: true },
    { to: '/admin/bookings', label: 'Reservasi & Front Desk', icon: BookOpenCheck },
    { to: '/admin/rooms', label: 'Unit Kamar Fisik', icon: DoorOpen },
    { to: '/admin/services', label: 'Tipe Kamar & Suite', icon: BedDouble, superAdminOnly: true },
    { to: '/admin/categories', label: 'Layanan Tambahan (Add-on)', icon: Coffee, superAdminOnly: true },
    { to: '/admin/coupons', label: 'Kupon & Promo Diskon', icon: TicketPercent, superAdminOnly: true },
    { to: '/admin/customers', label: 'Buku Tamu', icon: Users },
    { to: '/admin/users', label: 'Kelola User', icon: UserCog, superAdminOnly: true },
    { to: '/admin/payments', label: 'Transaksi Midtrans', icon: CreditCard, superAdminOnly: true },
    { to: '/admin/reports', label: 'Laporan Finansial', icon: BarChart3, superAdminOnly: true },
  ];
  const visibleNavItems = navItems.filter((item) => !item.superAdminOnly || isSuperAdmin);
  const roleLabel = isSuperAdmin ? 'Super Admin' : 'Front Desk';

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-800">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 border-r border-slate-900 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Hotel className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-white tracking-tight text-sm block">Royal Nusantara</span>
              <span className="text-[10px] text-amber-400 font-mono tracking-wider uppercase flex items-center space-x-1">
                <span>Front Desk PMS</span>
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Menu Operasional
          </div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {/* Super Admin Key Management shortcut in Sidebar */}
          {isSuperAdmin && (
            <div className="pt-4 mt-4 border-t border-slate-900 px-1">
              <div className="px-2 pb-2 text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center space-x-1">
                <Shield className="w-3 h-3 text-amber-400" />
                <span>Otoritas Super Admin</span>
              </div>
              <button
                type="button"
                onClick={openKeyModal}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition text-left"
              >
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Key Otorisasi Batal</span>
                </div>
                <span className="text-[10px] bg-amber-500/30 px-1.5 py-0.5 rounded text-amber-200">
                  Key
                </span>
              </button>
            </div>
          )}
        </nav>

        {/* Bottom Profile & Switch to Public */}
        <div className="p-4 border-t border-slate-900 space-y-3">
          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-amber-400 hover:bg-slate-900 transition"
          >
            <span className="flex items-center space-x-2">
              <ExternalLink className="w-4 h-4" />
              <span>Lihat Web Tamu</span>
            </span>
          </Link>

          <div className="flex items-center justify-between pt-3 border-t border-slate-900 px-1">
            <div className="truncate pr-2">
              <span className="text-xs font-bold text-white block truncate">{user?.name}</span>
              <span className="text-[10px] text-amber-400 font-mono">{roleLabel}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-900 transition"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="hidden lg:flex items-center space-x-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-800">Sistem Manajemen Hotel & Front Desk</span>
            <span>•</span>
            <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
              Midtrans Snap Integrated
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick Super Admin Key Button in Header */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={openKeyModal}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition shadow-sm"
                title="Kelola Key Konfirmasi Pembatalan Super Admin"
              >
                <Key className="w-3.5 h-3.5 text-amber-600" />
                <span>Key Otorisasi Batal</span>
              </button>
            )}

            <div className="text-right">
              <span className="text-xs font-bold text-slate-800 block">{user?.name}</span>
              <span className="text-[10px] text-slate-400">{user?.email}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {user?.name?.charAt(0) || 'A'}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Super Admin Key Management Modal */}
      {keyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Key Otorisasi Pembatalan
                  </h3>
                  <span className="text-[10px] text-amber-700 font-mono font-bold block">
                    Khusus Profil Super Admin / GM
                  </span>
                </div>
              </div>
              <button
                onClick={() => setKeyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center space-x-1.5 font-bold text-amber-800">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Pengamanan Reservasi Hotel</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800/90">
                Staf front desk tidak dapat membatalkan reservasi tamu tanpa memasukkan key ini. Anda dapat men-generate key baru kapan saja untuk keamanan.
              </p>
            </div>

            {loadingKey ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-600 border-t-transparent mx-auto mb-2"></div>
                Memuat key otorisasi...
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Key Pembatalan Aktif Saat Ini:
                </label>

                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-slate-900 text-amber-300 font-mono text-base font-black px-4 py-3 rounded-xl tracking-wider select-all text-center border border-slate-800 shadow-inner">
                    {cancellationKey || 'BELUM TERSEDIA'}
                  </div>
                  <button
                    type="button"
                    onClick={copyKey}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                    title="Salin Key"
                  >
                    {copiedKey ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={generatingKey}
                    onClick={handleGenerateNewKey}
                    className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${generatingKey ? 'animate-spin' : ''}`} />
                    <span>{generatingKey ? 'Men-generate...' : 'Generate Key Baru Sekarang'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setKeyModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
