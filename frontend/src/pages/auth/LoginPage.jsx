import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      const user = res.data?.user || res.user;

      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'admin' || user.role === 'super_admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/customer/dashboard', { replace: true });
      }
    } catch (err) {
      const message =
        err.response?.data?.errors?.email?.[0] ||
        err.response?.data?.message ||
        'Gagal masuk. Periksa kembali email dan kata sandi Anda.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fillQuickCredentials = (eMail, pwd) => {
    setEmail(eMail);
    setPassword(pwd);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-100">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mb-4 shadow-md shadow-indigo-200">
            <Calendar className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Selamat Datang Kembali</h2>
          <p className="text-sm text-slate-500 mt-1">Masuk ke akun Anda untuk mengelola atau memesan jadwal.</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-center mb-2">
            Akun Demo Pengujian
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={() => fillQuickCredentials('customer@booking.com', 'password123')}
              className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
            >
              Customer (Budi)
            </button>
            <button
              type="button"
              onClick={() => fillQuickCredentials('steve@gmail.com', 'password123')}
              className="text-xs px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold rounded-lg transition"
            >
              Customer (Steve)
            </button>
            <button
              type="button"
              onClick={() => fillQuickCredentials('staff@booking.com', 'password123')}
              className="text-xs px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg transition"
            >
              Front Desk Staff
            </button>
            <button
              type="button"
              onClick={() => fillQuickCredentials('admin@booking.com', 'password123')}
              className="text-xs px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded-lg transition"
            >
              Super Admin
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-slate-500">
          Belum memiliki akun?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-800">
            Daftar di sini
          </Link>
        </div>
      </div>
    </div>
  );
}

