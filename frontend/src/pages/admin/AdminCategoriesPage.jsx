import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatRupiah } from '../../utils/format';
import { Plus, Edit2, Trash2, Coffee, Check, Sparkles } from 'lucide-react';

export default function AdminCategoriesPage() {
  const toast = useToast();
  const [extras, setExtras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceType, setPriceType] = useState('per_stay'); // 'per_stay' | 'per_night'
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [extraToDelete, setExtraToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchExtras = async () => {
    setLoading(true);
    try {
      const res = await adminService.getExtraServices();
      if (res.data) {
        setExtras(res.data);
      }
    } catch (err) {
      toast.error('Gagal memuat daftar layanan tambahan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtras();
  }, []);

  const openCreateModal = () => {
    setEditingExtra(null);
    setName('');
    setDescription('');
    setPrice('');
    setPriceType('per_stay');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingExtra(item);
    setName(item.name);
    setDescription(item.description || '');
    setPrice(item.price);
    setPriceType(item.price_type === 'per_night' ? 'per_night' : 'per_stay');
    setIsActive(item.is_active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description?.trim() || '',
        price: Number(price),
        price_type: priceType,
        is_active: Boolean(isActive),
      };

      if (editingExtra) {
        await adminService.updateExtraService(editingExtra.id, payload);
        toast.success(`Layanan tambahan "${name}" berhasil diperbarui!`);
      } else {
        await adminService.createExtraService(payload);
        toast.success(`Layanan tambahan "${name}" berhasil ditambahkan!`);
      }

      setIsModalOpen(false);
      fetchExtras();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan layanan tambahan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!extraToDelete) return;
    setDeleting(true);
    try {
      await adminService.deleteExtraService(extraToDelete.id);
      toast.success(`Layanan tambahan "${extraToDelete.name}" berhasil dihapus.`);
      setDeleteModalOpen(false);
      setExtraToDelete(null);
      fetchExtras();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus layanan tambahan.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Layanan Tambahan (Add-Ons)</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola add-on hotel seperti Floating Breakfast, Antar Jemput Bandara Alphard, Sunset Luxury Spa, atau Extra Bed.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow-md transition self-start sm:self-auto text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Layanan Add-On</span>
        </button>
      </div>

      {/* Grid of Extra Services */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent mx-auto mb-2"></div>
          Memuat daftar layanan add-on...
        </div>
      ) : extras.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
          <Coffee className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">Belum ada layanan add-on</h3>
          <p className="text-xs text-slate-400">Tambahkan pengalaman tambahan yang dapat dipilih tamu saat reservasi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {extras.map((extra) => (
            <div
              key={extra.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(extra)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setExtraToDelete(extra);
                        setDeleteModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-900 text-base">{extra.name}</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      extra.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {extra.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                  {extra.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold">
                  Tipe: {extra.price_type === 'per_night' ? 'Per Malam' : 'Per Masa Inap'}
                </span>
                <span className="text-sm font-black text-amber-700">
                  {formatRupiah(extra.price)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {editingExtra ? 'Edit Layanan Add-On' : 'Tambah Layanan Add-On'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Layanan *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Floating Breakfast in Pool"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Harga Add-On (Rp) *
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="350000"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Model Perhitungan Tarif *
                </label>
                <select
                  value={priceType}
                  onChange={(e) => setPriceType(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="per_stay">Per Masa Inap (Flat Sekali Bayar)</option>
                  <option value="per_night">Per Malam Inap (Dikalikan Jumlah Malam)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Layanan
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan detail fasilitas layanan tambahan..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="activeToggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Aktif dan dapat dipilih oleh tamu saat pemesanan kamar
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 shadow-md transition"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Layanan'}
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
        onConfirm={handleDelete}
        loading={deleting}
        type="danger"
        title="Hapus Layanan Add-On?"
        message={`Apakah Anda yakin ingin menghapus layanan "${extraToDelete?.name}"? Reservasi sebelumnya yang telah memesan layanan ini tetap tercatat.`}
        confirmText="Hapus Layanan"
        cancelText="Batal"
      />
    </div>
  );
}
