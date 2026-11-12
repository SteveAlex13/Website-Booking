import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatRupiah, formatDate } from '../../utils/format';
import {
  TicketPercent,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Check,
  Tag,
  Percent,
  DollarSign,
  Calendar,
  Users,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function AdminCouponsPage() {
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('percentage'); // 'percentage' | 'fixed'
  const [value, setValue] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Copy Feedback
  const [copiedCode, setCopiedCode] = useState(null);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await adminService.getCoupons(params);
      if (res.data) {
        const list = Array.isArray(res.data) ? res.data : res.data.data || [];
        setCoupons(list);
      }
    } catch (err) {
      toast.error('Gagal memuat daftar kupon diskon.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCoupons();
  };

  const handleCopyCode = (couponCode) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCode(couponCode);
    toast.info(`Kode "${couponCode}" disalin ke clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const openCreateModal = () => {
    setEditingCoupon(null);
    setCode('');
    setName('');
    setType('percentage');
    setValue('');
    setMinSpend('0');
    setMaxDiscount('');
    setUsageLimit('');
    setExpiresAt('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setName(coupon.name);
    setType(coupon.type);
    setValue(coupon.value);
    setMinSpend(coupon.min_spend || '0');
    setMaxDiscount(coupon.max_discount || '');
    setUsageLimit(coupon.usage_limit || '');
    setExpiresAt(coupon.expires_at ? coupon.expires_at.split('T')[0] : '');
    setIsActive(Boolean(coupon.is_active));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        type,
        value: Number(value),
        min_spend: minSpend ? Number(minSpend) : 0,
        max_discount: maxDiscount ? Number(maxDiscount) : null,
        usage_limit: usageLimit ? Number(usageLimit) : null,
        expires_at: expiresAt || null,
        is_active: isActive,
      };

      if (editingCoupon) {
        await adminService.updateCoupon(editingCoupon.id, payload);
        toast.success(`Kupon "${payload.code}" berhasil diperbarui!`);
      } else {
        await adminService.createCoupon(payload);
        toast.success(`Kupon "${payload.code}" berhasil ditambahkan!`);
      }

      setIsModalOpen(false);
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan kupon.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (coupon) => {
    try {
      await adminService.toggleCouponStatus(coupon.id);
      toast.success(`Status kupon ${coupon.code} berhasil diubah.`);
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
      );
    } catch (err) {
      toast.error('Gagal memperbarui status kupon.');
    }
  };

  const openDeleteModal = (coupon) => {
    setCouponToDelete(coupon);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!couponToDelete) return;
    setDeleting(true);
    try {
      await adminService.deleteCoupon(couponToDelete.id);
      toast.success(`Kupon "${couponToDelete.code}" berhasil dihapus.`);
      setDeleteModalOpen(false);
      setCouponToDelete(null);
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus kupon.');
    } finally {
      setDeleting(false);
    }
  };

  // Stats Metrics
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => c.is_active).length;
  const totalUsed = coupons.reduce((sum, c) => sum + (Number(c.used_count) || 0), 0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-600 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Manajemen Diskon & Promosi</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Kupon & Promo Diskon</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola kode voucher potongan harga untuk pemesanan kamar hotel tamu.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-2xl font-bold text-xs shadow-md shadow-amber-600/30 transition transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Kupon Baru</span>
        </button>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <TicketPercent className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalCoupons}</div>
            <div className="text-xs font-semibold text-slate-400">Total Kupon Promo</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">{activeCoupons}</div>
            <div className="text-xs font-semibold text-slate-400">Kupon Aktif Siap Pakai</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalUsed}x</div>
            <div className="text-xs font-semibold text-slate-400">Total Transaksi Dipakai</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari kode kupon / nama promo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="">Semua Status</option>
            <option value="active">Aktif Saja</option>
            <option value="inactive">Nonaktif Saja</option>
          </select>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent mx-auto mb-2"></div>
            Memuat data kupon diskon...
          </div>
        ) : coupons.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <TicketPercent className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-700 text-sm">Belum Ada Kupon Diskon</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Klik tombol "Buat Kupon Baru" untuk menambahkan promo diskon pertama Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-4 px-6">Kode Promo & Nama</th>
                  <th className="py-4 px-4">Tipe & Nilai Diskon</th>
                  <th className="py-4 px-4">Syarat & Ketentuan</th>
                  <th className="py-4 px-4">Penggunaan Kuota</th>
                  <th className="py-4 px-4">Masa Berlaku</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coupons.map((coupon) => {
                  const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                  const isLimitReached =
                    coupon.usage_limit !== null &&
                    Number(coupon.used_count) >= Number(coupon.usage_limit);

                  return (
                    <tr key={coupon.id} className="hover:bg-slate-50/70 transition">
                      {/* Code & Name */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-black text-xs text-amber-900 bg-amber-100/70 border border-amber-200 px-2.5 py-1 rounded-lg tracking-wider">
                            {coupon.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(coupon.code)}
                            title="Salin kode"
                            className="p-1 text-slate-400 hover:text-amber-700 transition"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="font-bold text-slate-900 mt-1">{coupon.name}</div>
                      </td>

                      {/* Type & Discount Value */}
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-1.5">
                          {coupon.type === 'percentage' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Percent className="w-3 h-3 mr-0.5" />
                              {Math.round(coupon.value)}% OFF
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-teal-50 text-teal-700 border border-teal-200">
                              <DollarSign className="w-3 h-3 mr-0.5" />
                              {formatRupiah(coupon.value)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Terms */}
                      <td className="py-4 px-4 text-slate-600 text-[11px] space-y-0.5">
                        <div>
                          Min. Belanja:{' '}
                          <span className="font-semibold text-slate-900">
                            {Number(coupon.min_spend) > 0
                              ? formatRupiah(coupon.min_spend)
                              : 'Tanpa Minimum'}
                          </span>
                        </div>
                        {coupon.type === 'percentage' && (
                          <div className="text-slate-400">
                            Maks. Diskon:{' '}
                            <span className="font-semibold text-slate-700">
                              {coupon.max_discount
                                ? formatRupiah(coupon.max_discount)
                                : 'Tanpa Batas'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Usage quota */}
                      <td className="py-4 px-4 text-[11px]">
                        <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                          <span>{coupon.used_count || 0}</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-slate-500">
                            {coupon.usage_limit ? `${coupon.usage_limit}x` : '∞ Bebas'}
                          </span>
                        </div>
                        {isLimitReached && (
                          <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                            Kuota Habis
                          </span>
                        )}
                      </td>

                      {/* Expiration */}
                      <td className="py-4 px-4 text-[11px]">
                        {coupon.expires_at ? (
                          <div>
                            <span
                              className={`font-semibold ${
                                isExpired ? 'text-rose-600 line-through' : 'text-slate-700'
                              }`}
                            >
                              {formatDate(coupon.expires_at)}
                            </span>
                            {isExpired && (
                              <span className="text-[10px] text-rose-600 font-bold block">
                                Kedaluwarsa
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Tanpa Batas Waktu</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(coupon)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            coupon.is_active ? 'bg-amber-600' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              coupon.is_active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className="block text-[10px] font-bold mt-1 text-slate-500">
                          {coupon.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(coupon)}
                            className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition"
                            title="Edit Kupon"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(coupon)}
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                            title="Hapus Kupon"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create / Edit Coupon */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <TicketPercent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingCoupon ? 'Edit Kupon Promo' : 'Buat Kupon Promo Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">Atur parameter dan ketentuan diskon kamar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Code */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kode Promo (Huruf Kapital, Contoh: ROYALVIP) *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="MISAL: DISKON15"
                  className="w-full p-3 font-mono font-bold uppercase tracking-wider rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Judul Promo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Promo Menginap Spesial Akhir Pekan 15%"
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                />
              </div>

              {/* Type and Value Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipe Diskon *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold cursor-pointer"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal Tetap (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nilai Diskon {type === 'percentage' ? '(%)' : '(Rp)'} *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max={type === 'percentage' ? '100' : undefined}
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={type === 'percentage' ? 'Contoh: 15' : 'Contoh: 100000'}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Min Spend and Max Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Minimal Transaksi (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    placeholder="0 (Jika tanpa minimum)"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                  />
                </div>

                {type === 'percentage' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Maksimal Diskon (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(e.target.value)}
                      placeholder="Kosongkan jika bebas"
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Usage Limit & Expiration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Batas Kuota Pemakaian
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder="Kosongkan jika tak terbatas"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Kedaluwarsa
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="pt-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span className="font-bold text-slate-800">
                    Kupon Aktif (Dapat langsung digunakan oleh tamu di web)
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold transition shadow-md shadow-amber-600/30 disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : editingCoupon ? 'Simpan Perubahan' : 'Buat Kupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Kupon Promo?"
        message={`Apakah Anda yakin ingin menghapus kode kupon "${couponToDelete?.code}"? Kupon ini tidak akan bisa digunakan lagi oleh tamu.`}
        confirmText="Ya, Hapus Kupon"
        cancelText="Batal"
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}

