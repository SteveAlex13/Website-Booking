import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { useToast } from '../../contexts/ToastContext';
import { User, Phone, Lock, CheckCircle2, AlertCircle, Key, RefreshCw, Copy, Check, Shield } from 'lucide-react';

export default function CustomerProfilePage() {
  const { user, updateProfile } = useAuth();

  const toast = useToast();
  const isSuperAdmin = user?.role === 'super_admin';

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    password: '',
    password_confirmation: '',
  });

  const [cancellationKey, setCancellationKey] = useState('');
  const [loadingKey, setLoadingKey] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      setLoadingKey(true);
      authService.getCancellationKey()
        .then((res) => {
          if (res.data?.data?.cancellation_key) {
            setCancellationKey(res.data.data.cancellation_key);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingKey(false));
    }
  }, [isSuperAdmin]);

  const handleGenerateKey = async () => {
    setGeneratingKey(true);
    try {
      const res = await authService.generateCancellationKey();
      if (res.data?.data?.cancellation_key) {
        setCancellationKey(res.data.data.cancellation_key);
        toast.success('Key otorisasi pembatalan baru berhasil dibuat!');
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
    toast.info('Key otorisasi pembatalan disalin!');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (formData.password && formData.password !== formData.password_confirmation) {
      setMessage({ type: 'error', text: 'Konfirmasi kata sandi baru tidak cocok.' });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
      };
      if (formData.password) {
        payload.password = formData.password;
        payload.password_confirmation = formData.password_confirmation;
      }

      await updateProfile(payload);
      setMessage({ type: 'success', text: 'Profil Anda berhasil diperbarui.' });
      setFormData((prev) => ({ ...prev, password: '', password_confirmation: '' }));
    } catch (err) {
      const errs = err.response?.data?.errors;
      const msg = errs ? Object.values(errs)[0]?.[0] : err.response?.data?.message;
      setMessage({ type: 'error', text: msg || 'Gagal memperbarui profil.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Profil Saya</h1>
        <p className="text-sm text-slate-500 mt-1">Kelola data informasi akun dan kata sandi Anda.</p>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Email (Tidak dapat diubah)
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Nama Lengkap
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Nomor WhatsApp / Telepon
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Ganti Kata Sandi (Opsional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Kata Sandi Baru</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    minLength={8}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 8 karakter"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Ulangi Kata Sandi Baru</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="password"
                    name="password_confirmation"
                    minLength={8}
                    value={formData.password_confirmation}
                    onChange={handleChange}
                    placeholder="Ulangi kata sandi"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>

      {/* Super Admin Cancellation Key Section */}
      {isSuperAdmin && (
        <div className="bg-white p-8 rounded-3xl border border-amber-200/80 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Key Otorisasi Pembatalan (Super Admin)
              </h2>
              <p className="text-xs text-slate-500">
                Key rahasia yang wajib dimasukkan saat staf Front Desk membatalkan reservasi tamu hotel.
              </p>
            </div>
          </div>

          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold">
              <Shield className="w-4 h-4 text-amber-600" />
              <span>Otoritas Khusus General Manager / Super Admin</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Staf resepsionis tidak dapat membatalkan reservasi hotel sembarangan. Berikan key ini hanya kepada staf yang berwenang, atau buat key baru secara berkala.
            </p>
          </div>

          {loadingKey ? (
            <div className="py-6 text-center text-xs text-slate-400">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-600 border-t-transparent mx-auto mb-2"></div>
              Memuat key aktif...
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-slate-700">
                Key Pembatalan Aktif:
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
                  onClick={handleGenerateKey}
                  className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generatingKey ? 'animate-spin' : ''}`} />
                  <span>{generatingKey ? 'Men-generate...' : 'Generate Key Baru Sekarang'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

