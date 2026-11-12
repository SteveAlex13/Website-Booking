import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatRupiah, formatRoomSize } from '../../utils/format';
import RoomImage from '../../components/common/RoomImage';
import {
  Plus,
  Edit2,
  Trash2,
  BedDouble,
  Users,
  Star,
  Check,
  DoorOpen,
  Search,
} from 'lucide-react';

export default function AdminServicesPage() {
  const toast = useToast();
  const [roomTypes, setRoomTypes] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [weekendPrice, setWeekendPrice] = useState('');
  const [maxAdults, setMaxAdults] = useState(2);
  const [maxChildren, setMaxChildren] = useState(1);
  const [sizeSqm, setSizeSqm] = useState(45);
  const [bedType, setBedType] = useState('King Bed');
  const [totalRooms, setTotalRooms] = useState(5);
  const [isActive, setIsActive] = useState(true);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesRes, amenRes] = await Promise.all([
        adminService.getRoomTypes({ search: searchTerm }),
        adminService.getAmenities(),
      ]);
      if (typesRes.data?.data) {
        setRoomTypes(typesRes.data.data);
      } else if (typesRes.data) {
        setRoomTypes(typesRes.data);
      }
      if (amenRes.data) {
        setAmenities(amenRes.data);
      }
    } catch (err) {
      toast.error('Gagal memuat data tipe kamar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const openCreateModal = () => {
    setEditingType(null);
    setName('');
    setDescription('');
    setBasePrice('');
    setWeekendPrice('');
    setMaxAdults(2);
    setMaxChildren(1);
    setSizeSqm(45);
    setBedType('King Bed');
    setTotalRooms(5);
    setIsActive(true);
    setSelectedAmenities(amenities.slice(0, 4).map((a) => a.id));
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingType(item);
    setName(item.name);
    setDescription(item.description || '');
    setBasePrice(item.base_price_per_night);
    setWeekendPrice(item.weekend_price_per_night || '');
    setMaxAdults(item.max_adults);
    setMaxChildren(item.max_children);
    setSizeSqm(item.room_size_sqm);
    setBedType(item.bed_type);
    setTotalRooms(item.total_rooms);
    setIsActive(item.is_active);
    setSelectedAmenities(item.amenities ? item.amenities.map((a) => a.id) : []);
    setIsModalOpen(true);
  };

  const toggleAmenity = (id) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((aId) => aId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name,
        description,
        base_price_per_night: basePrice,
        weekend_price_per_night: weekendPrice || null,
        max_adults: maxAdults,
        max_children: maxChildren,
        room_size_sqm: sizeSqm,
        bed_type: bedType,
        total_rooms: totalRooms,
        is_active: isActive,
        amenities: selectedAmenities,
      };

      if (editingType) {
        await adminService.updateRoomType(editingType.id, payload);
        toast.success(`Tipe Kamar "${name}" berhasil diperbarui!`);
      } else {
        await adminService.createRoomType(payload);
        toast.success(`Tipe Kamar "${name}" berhasil ditambahkan!`);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan tipe kamar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!typeToDelete) return;
    setDeleting(true);
    try {
      await adminService.deleteRoomType(typeToDelete.id);
      toast.success(`Tipe kamar "${typeToDelete.name}" berhasil dihapus.`);
      setDeleteModalOpen(false);
      setTypeToDelete(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus tipe kamar.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Tipe Kamar & Suite</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola katalog kamar, penetapan tarif malam reguler & weekend, kapasitas tamu, dan fasilitas suite.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow-md transition self-start sm:self-auto text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Tipe Kamar</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama kamar atau kasur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500 hidden sm:block">
          Total {roomTypes.length} Tipe Kamar
        </span>
      </div>

      {/* Room Types Cards */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent mx-auto mb-2"></div>
          Memuat daftar tipe kamar...
        </div>
      ) : roomTypes.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
          <BedDouble className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">Belum ada tipe kamar</h3>
          <p className="text-xs text-slate-400">Silakan tambahkan tipe kamar baru untuk mulai menerima booking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roomTypes.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 bg-slate-900 overflow-hidden">
                  <RoomImage
                    src={room.image_url || room.featured_image}
                    alt={room.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white flex items-center space-x-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{room.bed_type}</span>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(room)}
                      className="p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow-sm transition"
                      title="Edit Tipe"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setTypeToDelete(room);
                        setDeleteModalOpen(true);
                      }}
                      className="p-1.5 bg-white/90 hover:bg-white text-rose-600 rounded-lg shadow-sm transition"
                      title="Hapus Tipe"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-amber-500/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {formatRoomSize(room)}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-900 text-base">{room.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        room.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {room.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2">{room.description}</p>

                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 pt-1">
                    <span className="bg-slate-100 px-2 py-1 rounded-lg">
                      👥 Max {room.max_adults} Dws, {room.max_children} Ank
                    </span>
                    <span className="bg-slate-100 px-2 py-1 rounded-lg font-mono">
                      🚪 {room.rooms_count ?? room.total_rooms} Unit Kamar
                    </span>
                  </div>

                  {room.amenities && room.amenities.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                      {room.amenities.slice(0, 3).map((a) => (
                        <span
                          key={a.id}
                          className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-semibold"
                        >
                          ✓ {a.name}
                        </span>
                      ))}
                      {room.amenities.length > 3 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{room.amenities.length - 3} lagi
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 pt-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Tarif Reguler
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {formatRupiah(room.base_price_per_night)}
                  </span>
                </div>
                {room.weekend_price_per_night && (
                  <div className="text-right">
                    <span className="text-[10px] text-amber-700 font-bold uppercase block">
                      Tarif Weekend
                    </span>
                    <span className="text-xs font-bold text-amber-900">
                      {formatRupiah(room.weekend_price_per_night)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">
                {editingType ? `Edit Tipe Kamar: ${editingType.name}` : 'Tambah Tipe Kamar Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Tipe Kamar / Suite *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Deluxe Ocean Suite"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tarif Reguler / Malam (Rp) *
                  </label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="1500000"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tarif Weekend / Malam (Opsional Rp)
                  </label>
                  <input
                    type="number"
                    value={weekendPrice}
                    onChange={(e) => setWeekendPrice(e.target.value)}
                    placeholder="1800000"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipe Kasur *
                  </label>
                  <select
                    value={bedType}
                    onChange={(e) => setBedType(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="King Bed">King Bed</option>
                    <option value="Twin Bed">Twin Bed</option>
                    <option value="Queen Bed">Queen Bed</option>
                    <option value="2 King Beds">2 King Beds</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ukuran Kamar (m²) *
                  </label>
                  <input
                    type="number"
                    value={sizeSqm}
                    onChange={(e) => setSizeSqm(Number(e.target.value))}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kapasitas Dewasa *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxAdults}
                    onChange={(e) => setMaxAdults(Number(e.target.value))}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kapasitas Anak *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={maxChildren}
                    onChange={(e) => setMaxChildren(Number(e.target.value))}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Total Kuota Kamar Fisik (Unit) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={totalRooms}
                    onChange={(e) => setTotalRooms(Number(e.target.value))}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deskripsi Suite
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Jelaskan fasilitas, pemandangan, dan interior kamar..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Amenities checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Fasilitas Kamar (Pilih yang Tersedia)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-40 overflow-y-auto">
                  {amenities.map((a) => (
                    <label
                      key={a.id}
                      className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAmenities.includes(a.id)}
                        onChange={() => toggleAmenity(a.id)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>{a.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Tipe kamar aktif dan dapat dipesan oleh tamu di website publik
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
                  {submitting ? 'Menyimpan...' : 'Simpan Tipe Kamar'}
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
        title="Hapus Tipe Kamar?"
        message={`Apakah Anda yakin ingin menghapus tipe kamar "${typeToDelete?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Tipe Kamar"
        cancelText="Batal"
      />
    </div>
  );
}
