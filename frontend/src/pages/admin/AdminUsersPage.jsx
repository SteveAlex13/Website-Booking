import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatDate } from '../../utils/format';
import {
  UserCog,
  UserPlus,
  Search,
  Pencil,
  Power,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

const ROLE_CONFIG = {
  customer: { label: 'Tamu', bg: 'bg-slate-100', text: 'text-slate-700' },
  admin: { label: 'Front Desk', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  super_admin: { label: 'Super Admin', bg: 'bg-amber-50', text: 'text-amber-800' },
};

const EMPTY_FORM = { name: '', email: '', phone: '', role: 'admin', password: '' };

// Turn a Laravel validation error response into one readable sentence
const errorMessage = (err, fallback) => {
  const errors = err.response?.data?.errors;
  if (errors) return Object.values(errors).flat().join(' ');
  return err.response?.data?.message || fallback;
};

export default function AdminUsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0 });
  const [reloadKey, setReloadKey] = useState(0);

  // Create / edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // user being edited, null = creating
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Activate / deactivate confirmation
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const params = { page };
        if (appliedSearch) params.search = appliedSearch;
        if (roleFilter) params.role = roleFilter;
        if (statusFilter) params.status = statusFilter;

        const res = await adminService.getUsers(params);
        if (res.data?.data) {
          setUsers(res.data.data);
          setMeta({
            last_page: res.data.last_page || 1,
            total: res.data.total ?? res.data.data.length,
          });
        }
      } catch (err) {
        toast.error(errorMessage(err, 'Gagal memuat daftar user.'));
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [appliedSearch, roleFilter, statusFilter, page, reloadKey]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, phone: u.phone || '', role: u.role, password: '' });
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    if (!saving) setFormOpen(false);
  };

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const res = editing
        ? await adminService.updateUser(editing.id, {
            name: form.name,
            email: form.email,
            phone: form.phone || null,
            role: form.role,
          })
        : await adminService.createUser({
            name: form.name,
            email: form.email,
            phone: form.phone || null,
            role: form.role,
            password: form.password,
          });

      toast.success(res.message || 'Data user tersimpan.');
      setFormOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(errorMessage(err, 'Gagal menyimpan data user.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      const res = await adminService.toggleUserActive(toggleTarget.id);
      toast.success(res.message || 'Status akun diperbarui.');
      setToggleTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(errorMessage(err, 'Gagal mengubah status akun.'));
    } finally {
      setToggling(false);
    }
  };

  const inputClass =
    'w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center space-x-2">
            <UserCog className="w-6 h-6 text-amber-600" />
            <span>Kelola User</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Buat akun staf, ubah peran dan data, atau nonaktifkan akun. Akun tidak dihapus, hanya diblokir dari login.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md text-xs transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Akun Staf</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, email, nomor HP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </form>
        <select
          value={roleFilter}
          onChange={(e) => {
            setPage(1);
            setRoleFilter(e.target.value);
          }}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Peran</option>
          <option value="customer">Tamu</option>
          <option value="admin">Front Desk</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
        >
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Memuat daftar user...</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">Tidak ada user yang cocok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 text-left">Nama</th>
                  <th className="px-5 py-3.5 text-left">Email</th>
                  <th className="px-5 py-3.5 text-left">Telepon</th>
                  <th className="px-5 py-3.5 text-left">Peran</th>
                  <th className="px-5 py-3.5 text-left">Status</th>
                  <th className="px-5 py-3.5 text-left">Reservasi</th>
                  <th className="px-5 py-3.5 text-left">Bergabung</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const role = ROLE_CONFIG[u.role] || ROLE_CONFIG.customer;
                  const isMe = me?.id === u.id;
                  return (
                    <tr key={u.id} className={`hover:bg-slate-50/70 transition ${u.is_active ? '' : 'opacity-60'}`}>
                      <td className="px-5 py-4 font-bold text-slate-900 whitespace-nowrap">
                        {u.name}
                        {isMe && <span className="ml-2 text-[10px] font-bold text-amber-700">(Anda)</span>}
                      </td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{u.email}</td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{u.phone || '-'}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${role.bg} ${role.text}`}>
                          {role.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap text-xs">
                        {u.bookings_count || 0} booking
                      </td>
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap text-xs">{formatDate(u.created_at)}</td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                          title="Ubah data dan peran"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isMe}
                          onClick={() => setToggleTarget(u)}
                          className={`p-1.5 rounded-lg hover:bg-slate-100 transition disabled:opacity-30 disabled:cursor-not-allowed ${
                            u.is_active ? 'text-slate-400 hover:text-rose-600' : 'text-emerald-600 hover:text-emerald-700'
                          }`}
                          title={isMe ? 'Tidak bisa menonaktifkan akun sendiri' : u.is_active ? 'Nonaktifkan akun' : 'Aktifkan akun'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Halaman {page} dari {meta.last_page} ({meta.total} user)
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>
            <button
              type="button"
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Create / edit modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editing ? 'Ubah Data User' : 'Tambah Akun Staf'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editing
                    ? 'Mengubah peran akan mengeluarkan user dari semua perangkat.'
                    : 'Akun baru langsung aktif dan bisa login dengan kata sandi awal ini.'}
                </p>
              </div>
              <button type="button" onClick={closeForm} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Lengkap *</label>
              <input type="text" required value={form.name} onChange={setField('name')} className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Email *</label>
              <input type="email" required value={form.email} onChange={setField('email')} className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Nomor HP</label>
              <input type="text" value={form.phone} onChange={setField('phone')} className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Peran *</label>
              <select
                value={form.role}
                onChange={setField('role')}
                disabled={editing && editing.id === me?.id}
                className={`${inputClass} cursor-pointer disabled:opacity-50`}
              >
                {editing && <option value="customer">Tamu</option>}
                <option value="admin">Front Desk</option>
                <option value="super_admin">Super Admin</option>
              </select>
              {editing && editing.id === me?.id && (
                <p className="text-[10px] text-slate-400 mt-1">Anda tidak bisa mengubah peran akun sendiri.</p>
              )}
            </div>

            {!editing && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kata Sandi Awal * (min. 8 karakter)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={setField('password')}
                  className={inputClass}
                />
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                {formError}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Akun'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        loading={toggling}
        type={toggleTarget?.is_active ? 'danger' : 'info'}
        title={toggleTarget?.is_active ? 'Nonaktifkan Akun?' : 'Aktifkan Akun?'}
        message={
          toggleTarget
            ? toggleTarget.is_active
              ? `${toggleTarget.name} (${toggleTarget.email}) tidak akan bisa login lagi dan akan dikeluarkan dari semua perangkat. Data dan riwayat reservasinya tetap tersimpan.`
              : `${toggleTarget.name} (${toggleTarget.email}) akan bisa login kembali.`
            : ''
        }
        confirmText={toggleTarget?.is_active ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}
        cancelText="Batal"
      />
    </div>
  );
}
