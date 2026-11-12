import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import {
  DoorOpen,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  BedDouble,
  Building,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Search,
} from 'lucide-react';

const STATUS_MAP = {
  available: { label: 'Tersedia', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  occupied: { label: 'Terisi (Occupied)', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  cleaning: { label: 'Pembersihan (Cleaning)', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  maintenance: { label: 'Perbaikan (Maintenance)', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

export default function AdminRoomsPage() {
  const toast = useToast();
  const { isSuperAdmin } = useAuth(); // front desk can change room status, only super admin adds or deletes rooms
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add Room Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formRoomTypeId, setFormRoomTypeId] = useState('');
  const [formRoomNumber, setFormRoomNumber] = useState('');
  const [formFloor, setFormFloor] = useState(1);
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Room Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roomsRes, typesRes] = await Promise.all([
        adminService.getRooms(),
        adminService.getRoomTypes(),
      ]);
      setRooms(roomsRes.data || []);
      setRoomTypes(typesRes.data || []);
      if (typesRes.data && typesRes.data.length > 0 && !formRoomTypeId) {
        setFormRoomTypeId(typesRes.data[0].id);
      }
    } catch (err) {
      toast.error('Gagal memuat data kamar hotel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!formRoomNumber) {
      toast.error('Nomor kamar harus diisi.');
      return;
    }
    setSubmitting(true);
    try {
      await adminService.createRoom({
        room_type_id: formRoomTypeId,
        room_number: formRoomNumber,
        floor: formFloor,
        notes: formNotes,
      });
      toast.success(`Unit Kamar ${formRoomNumber} berhasil didaftarkan!`);
      setIsAddOpen(false);
      setFormRoomNumber('');
      setFormNotes('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan unit kamar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (roomId, newStatus) => {
    try {
      await adminService.updateRoomStatus(roomId, newStatus);
      toast.success(`Status kamar berhasil diubah menjadi ${STATUS_MAP[newStatus]?.label}`);
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengubah status kamar.');
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    setDeleting(true);
    try {
      await adminService.deleteRoom(roomToDelete.id);
      toast.success(`Unit kamar ${roomToDelete.room_number} berhasil dihapus.`);
      setDeleteModalOpen(false);
      setRoomToDelete(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus unit kamar.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.room_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.room_type?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? r.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  // Calculate status counts
  const availableCount = rooms.filter((r) => r.status === 'available').length;
  const occupiedCount = rooms.filter((r) => r.status === 'occupied').length;
  const cleaningCount = rooms.filter((r) => r.status === 'cleaning').length;
  const maintenanceCount = rooms.filter((r) => r.status === 'maintenance').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 p-8 rounded-3xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold backdrop-blur-sm">
            <DoorOpen className="w-3.5 h-3.5" />
            <span>Housekeeping & Front Desk Inventory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Inventaris Unit Kamar Fisik</h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            Kelola nomor kamar fisik (101, 102, dst.), lantai, serta ubah status operasional housekeeping secara langsung.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-amber-900/40 transition transform hover:-translate-y-0.5 text-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Unit Kamar</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter(statusFilter === 'available' ? '' : 'available')}
          className={`cursor-pointer p-5 rounded-2xl border transition bg-white shadow-sm hover:shadow-md ${
            statusFilter === 'available' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase">Tersedia</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{availableCount}</p>
          <span className="text-[10px] text-slate-400">Siap untuk tamu check-in</span>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'occupied' ? '' : 'occupied')}
          className={`cursor-pointer p-5 rounded-2xl border transition bg-white shadow-sm hover:shadow-md ${
            statusFilter === 'occupied' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase">Terisi (Occupied)</span>
            <BedDouble className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{occupiedCount}</p>
          <span className="text-[10px] text-slate-400">Sedang dihuni tamu</span>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'cleaning' ? '' : 'cleaning')}
          className={`cursor-pointer p-5 rounded-2xl border transition bg-white shadow-sm hover:shadow-md ${
            statusFilter === 'cleaning' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase">Pembersihan</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{cleaningCount}</p>
          <span className="text-[10px] text-slate-400">Proses housekeeping</span>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'maintenance' ? '' : 'maintenance')}
          className={`cursor-pointer p-5 rounded-2xl border transition bg-white shadow-sm hover:shadow-md ${
            statusFilter === 'maintenance' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase">Perbaikan</span>
            <Wrench className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{maintenanceCount}</p>
          <span className="text-[10px] text-slate-400">Perbaikan fasilitas</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari nomor kamar atau tipe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          {statusFilter && (
            <button
              onClick={() => setStatusFilter('')}
              className="text-xs text-amber-700 hover:underline px-2"
            >
              Reset Filter
            </button>
          )}
          <span className="text-xs font-semibold text-slate-500">
            Total {filteredRooms.length} Kamar
          </span>
        </div>
      </div>

      {/* Rooms Grid / Cards */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent mx-auto mb-2"></div>
          Memuat data unit kamar...
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
          <DoorOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">Tidak ada kamar ditemukan</h3>
          <p className="text-xs text-slate-400">Sesuaikan filter atau tambahkan unit kamar baru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const st = STATUS_MAP[room.status] || STATUS_MAP.available;
            return (
              <div
                key={room.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xl font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-xl">
                      #{room.room_number}
                    </span>
                    {isSuperAdmin && (
                      <button
                        onClick={() => {
                          setRoomToDelete(room);
                          setDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg transition"
                        title="Hapus Unit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{room.room_type?.name}</h4>
                  <div className="text-xs text-slate-500 mt-1 flex items-center space-x-2">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lantai {room.floor}</span>
                  </div>

                  {room.notes && (
                    <p className="text-[11px] text-slate-400 mt-2 bg-slate-50 p-2 rounded-lg italic">
                      "{room.notes}"
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Ubah Status Operasional
                  </div>
                  <select
                    value={room.status}
                    onChange={(e) => handleUpdateStatus(room.id, e.target.value)}
                    className={`w-full text-xs font-bold py-2 px-3 rounded-xl border transition ${st.bg} ${st.text} ${st.border} focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer`}
                  >
                    <option value="available">Tersedia (Ready)</option>
                    <option value="occupied">Terisi (Occupied)</option>
                    <option value="cleaning">Pembersihan (Cleaning)</option>
                    <option value="maintenance">Perbaikan (Maintenance)</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add Room */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-900">Tambah Unit Kamar Fisik</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipe Kamar / Suite *
                </label>
                <select
                  value={formRoomTypeId}
                  onChange={(e) => setFormRoomTypeId(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                >
                  {roomTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.bed_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Kamar (Contoh: 101, 204, VIL-01) *
                </label>
                <input
                  type="text"
                  value={formRoomNumber}
                  onChange={(e) => setFormRoomNumber(e.target.value)}
                  placeholder="101"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lantai
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formFloor}
                  onChange={(e) => setFormFloor(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Dekat lift / Pemandangan taman"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md transition"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Unit Kamar'}
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
        onConfirm={handleDeleteRoom}
        loading={deleting}
        type="danger"
        title="Hapus Unit Kamar?"
        message={`Apakah Anda yakin ingin menghapus Unit Kamar #${roomToDelete?.room_number}? Data riwayat check-in yang terkait akan tetap tersimpan.`}
        confirmText="Hapus Kamar"
        cancelText="Batal"
      />
    </div>
  );
}

