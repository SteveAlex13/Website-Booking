import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, Navigate, useLocation } from 'react-router-dom';
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
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function AdminLayout() {
  const { user, isAuthenticated, isAdmin, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_sidebar_open');
      if (saved !== null) {
        return saved === 'true';
      }
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_sidebar_open', String(next));
      }
      return next;
    });
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_sidebar_open', 'false');
    }
  };

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      closeSidebar();
    }
  };

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  // Close profile dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [profileDropdownOpen]);

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

  const location = useLocation();

  // Categorized Navigation
  const navCategories = [
    {
      id: 'operations',
      label: 'Operasional & Kamar',
      icon: BedDouble,
      items: [
        { to: '/admin/bookings', label: 'Reservasi & Front Desk', icon: BookOpenCheck },
        { to: '/admin/rooms', label: 'Unit Kamar Fisik', icon: DoorOpen },
        { to: '/admin/services', label: 'Tipe Kamar & Suite', icon: BedDouble, superAdminOnly: true },
      ],
    },
    {
      id: 'services_promo',
      label: 'Layanan & Promosi',
      icon: Coffee,
      items: [
        { to: '/admin/categories', label: 'Layanan Tambahan', icon: Coffee, superAdminOnly: true },
        { to: '/admin/coupons', label: 'Kupon & Promo', icon: TicketPercent, superAdminOnly: true },
      ],
    },
    {
      id: 'guests_users',
      label: 'Tamu & Akun Staf',
      icon: Users,
      items: [
        { to: '/admin/customers', label: 'Buku Tamu', icon: Users },
        { to: '/admin/users', label: 'Kelola User & Staf', icon: UserCog, superAdminOnly: true },
      ],
    },
    {
      id: 'finance_reports',
      label: 'Keuangan & Laporan',
      icon: BarChart3,
      items: [
        { to: '/admin/payments', label: 'Transaksi Pembayaran', icon: CreditCard, superAdminOnly: true },
        { to: '/admin/reports', label: 'Laporan Finansial', icon: BarChart3, superAdminOnly: true },
      ],
    },
  ];

  // Accordion state for collapsible categories (auto-expand active category)
  const [openCategories, setOpenCategories] = useState(() => {
    const p = location.pathname;
    return {
      operations: true, // Default open for quick daily front desk access
      services_promo: p.startsWith('/admin/categories') || p.startsWith('/admin/coupons'),
      guests_users: p.startsWith('/admin/customers') || p.startsWith('/admin/users'),
      finance_reports: p.startsWith('/admin/payments') || p.startsWith('/admin/reports'),
    };
  });

  const toggleCategory = (catId) => {
    setOpenCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  useEffect(() => {
    const p = location.pathname;
    if (['/admin/bookings', '/admin/rooms', '/admin/services'].some((url) => p.startsWith(url))) {
      setOpenCategories((prev) => ({ ...prev, operations: true }));
    } else if (p.startsWith('/admin/categories') || p.startsWith('/admin/coupons')) {
      setOpenCategories((prev) => ({ ...prev, services_promo: true }));
    } else if (p.startsWith('/admin/customers') || p.startsWith('/admin/users')) {
      setOpenCategories((prev) => ({ ...prev, guests_users: true }));
    } else if (p.startsWith('/admin/payments') || p.startsWith('/admin/reports')) {
      setOpenCategories((prev) => ({ ...prev, finance_reports: true }));
    }
  }, [location.pathname]);

  const roleLabel = isSuperAdmin ? 'Super Admin' : 'Front Desk';

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-800">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-900 shadow-2xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-20 px-5 flex items-center justify-between border-b border-slate-900">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
              <Hotel className="w-5 h-5" />
            </div>
            <div className="truncate">
              <span className="font-extrabold text-white tracking-tight text-sm block truncate">Royal Nusantara</span>
              <span className="text-[10px] text-amber-400 font-mono tracking-wider uppercase flex items-center space-x-1">
                <span>Front Desk PMS</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition flex items-center justify-center border border-slate-800 hover:border-slate-700 active:scale-95 shrink-0"
            title="Tutup Sidebar (Perbesar Tampilan)"
          >
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar-dark">
          {/* Top Single Item: Dashboard */}
          <NavLink
            to="/admin/dashboard"
            end
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
            <span>Dashboard Hotel</span>
          </NavLink>

          <div className="pt-3 pb-1 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Menu Operasional
          </div>

          {/* Categorized Accordion / Dropdown Menus */}
          {navCategories.map((cat) => {
            const CatIcon = cat.icon;
            const visibleItems = cat.items.filter((item) => !item.superAdminOnly || isSuperAdmin);
            if (visibleItems.length === 0) return null;

            const isOpen = !!openCategories[cat.id];
            const isAnyChildActive = visibleItems.some((item) =>
              item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
            );

            return (
              <div key={cat.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    isAnyChildActive
                      ? 'text-amber-400 bg-slate-900/90'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <CatIcon className={`w-4 h-4 flex-shrink-0 ${isAnyChildActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className="tracking-wide">{cat.label}</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-amber-400' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="ml-4 pl-3 border-l border-slate-800 space-y-1 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    {visibleItems.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          onClick={handleNavClick}
                          className={({ isActive }) =>
                            `flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                              isActive
                                ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-900'
                            }`
                          }
                        >
                          <ItemIcon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Super Admin Bottom Single Item: Profil & Aturan Hotel */}
          {isSuperAdmin && (
            <div className="pt-2">
              <NavLink
                to="/admin/schedules"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`
                }
              >
                <Hotel className="w-4 h-4 flex-shrink-0" />
                <span>Profil & Aturan Hotel</span>
              </NavLink>
            </div>
          )}
        </nav>

        {/* Bottom Switch to Public */}
        <div className="p-4 border-t border-slate-900">
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
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'
      }`}>
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20 border border-slate-200 shadow-sm active:scale-95"
              title={sidebarOpen ? "Tutup Sidebar" : "Buka Sidebar (Menu Navigasi)"}
            >
              <Menu className="w-5 h-5" />
              {!sidebarOpen && (
                <span className="text-xs font-bold text-slate-700 hidden sm:inline-flex items-center space-x-1">
                  <span>Menu Sidebar</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </span>
              )}
            </button>

            <div className="hidden sm:flex items-center space-x-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">Sistem Manajemen Hotel & Front Desk</span>
              <span>•</span>
              <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
                Midtrans Snap Integrated
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick Super Admin Key Button in Header */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={openKeyModal}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
                title="Kelola Key Konfirmasi Pembatalan Super Admin"
              >
                <Key className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Key Otorisasi Batal</span>
                <span className="sm:hidden">Key Batal</span>
              </button>
            )}

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                aria-expanded={profileDropdownOpen}
              >
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-bold text-slate-800 block leading-tight">{user?.name}</span>
                  <span className="text-[10px] text-amber-700 font-semibold">{roleLabel}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 text-white font-bold flex items-center justify-center text-xs shadow-sm ring-2 ring-white">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    profileDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Profile Card Header */}
                  <div className="px-3 py-2.5 bg-slate-50 rounded-xl mb-1 border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[130px]" title={user?.name}>
                        {user?.name}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isSuperAdmin
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {roleLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate" title={user?.email}>
                      {user?.email}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="space-y-0.5">
                    <Link
                      to="/admin/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition group"
                    >
                      <User className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
                      <span>Cek Profil</span>
                    </Link>

                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          openKeyModal();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition text-left group"
                      >
                        <Key className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
                        <span>Key Otorisasi Batal</span>
                      </button>
                    )}

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition text-left group"
                    >
                      <LogOut className="w-4 h-4 text-rose-500 group-hover:text-rose-600" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1600px] mx-auto w-full transition-all duration-300">
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
