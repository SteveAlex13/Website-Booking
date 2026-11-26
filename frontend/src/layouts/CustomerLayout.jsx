import React from 'react';
import { Link, NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Hotel, User, LogOut, ChevronRight, BedDouble, Calendar, Sparkles, Shield } from 'lucide-react';

export default function CustomerLayout() {
  const { user, isAuthenticated, isAdmin, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center space-x-6">
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20 group-hover:scale-105 transition transform">
                  <Hotel className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-base font-black text-slate-900 group-hover:text-amber-600 transition block leading-tight">
                    The Royal Nusantara
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">
                    Portal Reservasi Tamu
                  </span>
                </div>
              </Link>

              <div className="hidden sm:flex items-center space-x-1 text-xs text-slate-400">
                <ChevronRight className="w-4 h-4" />
                <span className="text-slate-600 font-semibold">Tamu Terdaftar</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 bg-slate-900 text-amber-400 hover:bg-slate-800 rounded-xl transition shadow-sm"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Panel Admin</span>
                </Link>
              )}
              <Link
                to="/services"
                className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-bold px-3.5 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-xl transition border border-amber-200"
              >
                <BedDouble className="w-3.5 h-3.5" />
                <span>+ Pesan Suite Baru</span>
              </Link>

              <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-slate-400">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex space-x-8 border-t border-slate-100 overflow-x-auto text-xs font-bold">
            <NavLink
              to="/customer/dashboard"
              end
              className={({ isActive }) =>
                `py-3 px-1 border-b-2 whitespace-nowrap transition ${
                  isActive
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`
              }
            >
              Reservasi & Menginap Saya
            </NavLink>
            <NavLink
              to="/customer/profile"
              className={({ isActive }) =>
                `py-3 px-1 border-b-2 whitespace-nowrap transition ${
                  isActive
                    ? 'border-amber-600 text-amber-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`
              }
            >
              Profil Tamu
            </NavLink>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>
    </div>
  );
}
