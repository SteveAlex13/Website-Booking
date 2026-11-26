import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import InvoiceModal from '../../components/common/InvoiceModal';
import QrisDownloadModal from '../../components/common/QrisDownloadModal';
import { formatRupiah, formatDate, formatDateTime, formatCheckoutTime, getBookingStayStatus, BOOKING_STATUS_CONFIG } from '../../utils/format';
import {
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  Calendar,
  LogIn,
  LogOut,
  DoorOpen,
  Hotel,
  Users,
  Copy,
  Check,
  XCircle,
  Shield,
  Key,
  CreditCard,
  Banknote,
  QrCode,
  Smartphone,
  FileText,
  Download,
  UserX,
  Clock,
} from 'lucide-react';

export default function AdminBookingsPage() {
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copiedId, setCopiedId] = useState(null);
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const [qrisBooking, setQrisBooking] = useState(null);

  // Check-In Modal State
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [selectedBookingForCheckIn, setSelectedBookingForCheckIn] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [allRoomsOfType, setAllRoomsOfType] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [offlinePaymentMethod, setOfflinePaymentMethod] = useState('cash'); // 'cash' | 'debit_card' | 'credit_card'
  const [selectedBank, setSelectedBank] = useState('bca'); // 'bca' | 'bri' | 'btn' | 'mandiri' | 'other'
  const [cardReference, setCardReference] = useState('');

  // Check-Out Modal State
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [selectedBookingForCheckOut, setSelectedBookingForCheckOut] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);

  // Cancel Modal State (with Super Admin Key)
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('Permintaan pembatalan langsung oleh tamu');
  const [cancellationKeyInput, setCancellationKeyInput] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewingBooking, setViewingBooking] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      if (search) params.search = search;

      const res = await adminService.getBookings(params);
      if (res.data?.data) {
        setBookings(res.data.data);
        setTotalPages(res.data.last_page || 1);
      }
    } catch (err) {
      toast.error('Gagal memuat daftar reservasi hotel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, dateFilter, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchBookings();
  };

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.info(`Kode ${code} disalin.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderPaymentBadge = (booking) => {
    const payment = booking?.latest_payment || booking?.latestPayment;
    const pType = payment?.payment_type;
    const isPaid = payment?.status === 'PAID';

    if (booking?.payment_method === 'cash') {
      if (isPaid && pType) {
        if (pType === 'cash') {
          return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <Banknote className="w-3 h-3 text-emerald-600" />
              <span>Tunai (Front Desk)</span>
            </span>
          );
        }
        if (pType.startsWith('qris_')) {
          const bank = pType.replace('qris_', '').toUpperCase();
          return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              <QrCode className="w-3 h-3 text-teal-600" />
              <span>QRIS {bank} (EDC)</span>
            </span>
          );
        }
        if (pType.startsWith('debit_')) {
          const bank = pType.replace('debit_', '').toUpperCase();
          return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              <CreditCard className="w-3 h-3 text-blue-600" />
              <span>Debit {bank} (EDC)</span>
            </span>
          );
        }
        if (pType.startsWith('credit_')) {
          const bank = pType.replace('credit_', '').toUpperCase();
          return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              <CreditCard className="w-3 h-3 text-purple-600" />
              <span>CC {bank} (EDC)</span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
            <CreditCard className="w-3 h-3 text-indigo-600" />
            <span>{pType.toUpperCase()} (EDC)</span>
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          <Banknote className="w-3 h-3 text-amber-600" />
          <span>Bayar di Tempat</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
        <CreditCard className="w-3 h-3 text-blue-600" />
        <span>Midtrans</span>
      </span>
    );
  };

  // Open Check-In Modal
  const openCheckInModal = async (booking) => {
    setSelectedBookingForCheckIn(booking);
    setSelectedRoomId('');
    setAvailableRooms([]);
    setAllRoomsOfType([]);
    setOfflinePaymentMethod('cash');
    setSelectedBank('bca');
    setCardReference('');
    setCheckInModalOpen(true);
    try {
      const res = await adminService.getAvailableRoomsForBooking(booking.id);
      const payload = res.data || res;
      const readyRooms = Array.isArray(payload) ? payload : (payload.rooms || payload.available_rooms || []);
      const allRooms = Array.isArray(payload) ? payload : (payload.all_rooms || readyRooms);
      setAvailableRooms(readyRooms);
      setAllRoomsOfType(allRooms);
      if (readyRooms.length > 0) {
        setSelectedRoomId(readyRooms[0].id);
      }
    } catch (err) {
      toast.error('Gagal memuat kamar yang tersedia.');
    }
  };

  // Submit Check-In
  const handleConfirmCheckIn = async (e) => {
    e.preventDefault();
    if (!selectedRoomId) {
      toast.error('Pilih unit kamar untuk tamu terlebih dahulu.');
      return;
    }
    setCheckingIn(true);
    try {
      const isCashBooking = selectedBookingForCheckIn?.payment_method === 'cash';
      const payload = {
        room_id: Number(selectedRoomId),
        offline_payment_method: isCashBooking ? offlinePaymentMethod : undefined,
        bank: isCashBooking && offlinePaymentMethod !== 'cash' ? selectedBank : undefined,
        card_reference: isCashBooking && offlinePaymentMethod !== 'cash' && cardReference.trim() ? cardReference.trim() : undefined,
      };
      await adminService.checkInGuest(selectedBookingForCheckIn.id, payload);
      toast.success(
        `Tamu ${selectedBookingForCheckIn.customer_name} berhasil Check-In!`
      );
      setCheckInModalOpen(false);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal melakukan check-in.');
    } finally {
      setCheckingIn(false);
    }
  };

  // Open Check-Out Modal
  const openCheckOutModal = (booking) => {
    setSelectedBookingForCheckOut(booking);
    setCheckOutModalOpen(true);
  };

  // Submit Check-Out
  const handleConfirmCheckOut = async () => {
    if (!selectedBookingForCheckOut) return;
    setCheckingOut(true);
    try {
      await adminService.checkOutGuest(selectedBookingForCheckOut.id);
      toast.success(
        `Tamu ${selectedBookingForCheckOut.customer_name} berhasil Check-Out. Kamar diubah ke status Pembersihan (Cleaning).`
      );
      setCheckOutModalOpen(false);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal melakukan check-out.');
    } finally {
      setCheckingOut(false);
    }
  };

  // Open Cancel Modal
  const openCancelModal = (booking) => {
    setSelectedBookingForCancel(booking);
    setCancelReason('Permintaan pembatalan langsung oleh tamu');
    setCancellationKeyInput('');
    setCancelModalOpen(true);
  };

  // Submit Cancel with Super Admin Key
  const handleConfirmCancelWithKey = async (e) => {
    e.preventDefault();
    if (!cancellationKeyInput.trim()) {
      toast.error('Key Konfirmasi Pembatalan Super Admin wajib diisi.');
      return;
    }
    setCancelling(true);
    try {
      const res = await adminService.cancelBooking(selectedBookingForCancel.id, {
        cancellation_key: cancellationKeyInput.trim(),
        reason: cancelReason,
      });
      // The message also tells when a refund was recorded for a paid booking
      toast.success(res.message || `Reservasi ${selectedBookingForCancel.booking_code} berhasil dibatalkan.`);
      setCancelModalOpen(false);
      setSelectedBookingForCancel(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membatalkan reservasi. Periksa kembali Key Otorisasi Super Admin.');
    } finally {
      setCancelling(false);
    }
  };

  const handleMarkNoShow = async (booking) => {
    if (!window.confirm(`Yakin ingin menandai reservasi ${booking.booking_code} atas nama "${booking.customer_name}" sebagai HANGUS (Tamu Tidak Hadir)?`)) {
      return;
    }
    try {
      await adminService.markNoShow(booking.id);
      toast.success(`Reservasi ${booking.booking_code} berhasil ditandai sebagai Hangus.`);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menandai reservasi hangus.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Front Desk & Reservasi Kamar</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manajemen operasional reservasi hotel, check-in tamu dengan alokasi nomor unit, dan checkout kamar.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Status Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {[
            { key: '', label: 'Semua Status' },
            { key: 'CONFIRMED', label: 'Terkonfirmasi (Siap Inap)' },
            { key: 'CHECKED_IN', label: 'Sedang Menginap' },
            { key: 'CHECKED_OUT', label: 'Checked Out' },
            { key: 'PENDING_PAYMENT', label: 'Menunggu Bayar' },
            { key: 'NO_SHOW', label: 'Hangus' },
            { key: 'CANCELLED', label: 'Dibatalkan' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                statusFilter === tab.key
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date & Keyword Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2 border-t border-slate-100">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari kode booking atau nama tamu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </form>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 font-semibold">Filter Tanggal:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-xs text-amber-700 font-bold hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-6 py-4">Kode & Tamu</th>
                <th className="px-6 py-4">Tipe Kamar</th>
                <th className="px-6 py-4">Periode Inap</th>
                <th className="px-6 py-4">Unit Kamar</th>
                <th className="px-6 py-4">Total Biaya</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi Front Desk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent mx-auto mb-2"></div>
                    Memuat data reservasi...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Tidak ada reservasi ditemukan.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const cfg = BOOKING_STATUS_CONFIG[b.status] || BOOKING_STATUS_CONFIG.PENDING_PAYMENT;
                  const isConfirmed = b.status === 'CONFIRMED';
                  const isCheckedIn = b.status === 'CHECKED_IN';
                  const stayStatus = getBookingStayStatus(b.check_in_date, b.check_out_date);

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1.5 font-mono font-bold text-slate-900">
                          <span>{b.booking_code}</span>
                          <button
                            onClick={() => copyCode(b.booking_code, b.id)}
                            className="text-slate-300 hover:text-slate-500"
                          >
                            {copiedId === b.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="font-semibold text-slate-800 mt-1">{b.customer_name}</div>
                        <div className="text-[11px] text-slate-400">{b.customer_phone}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{b.room_type?.name || b.service_name}</div>
                        <div className="text-[11px] text-slate-400">
                          {b.total_adults} Dewasa{b.total_children > 0 ? `, ${b.total_children} Anak` : ''}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 text-xs">
                          {formatDate(b.check_in_date)} (14:00) — {formatCheckoutTime(b.check_out_date, b.checked_out_at)}
                        </div>
                        <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                          {b.total_nights || 1} Malam
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {(b.assigned_room || b.room) ? (
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                            #{(b.assigned_room || b.room).room_number} (Lt. {(b.assigned_room || b.room).floor})
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Belum dialokasikan</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-black text-slate-900">{formatRupiah(b.total_amount)}</span>
                        <div className="mt-1">
                          {renderPaymentBadge(b)}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {(b.status === 'NO_SHOW' || (isConfirmed && stayStatus === 'OVERDUE')) ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border bg-rose-50 text-rose-700 border-rose-200">
                            Hangus
                          </span>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                          >
                            {cfg.label}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Check-In / No-Show Actions for Confirmed Bookings */}
                        {isConfirmed && (
                          <>
                            {stayStatus === 'OVERDUE' && (
                              <button
                                onClick={() => handleMarkNoShow(b)}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-[11px] shadow-sm transition"
                                title="Masa menginap telah lewat dan tamu tidak check-in. Klik untuk tandai Hangus."
                              >
                                <UserX className="w-3.5 h-3.5 text-rose-600" />
                                <span>Tandai Hangus</span>
                              </button>
                            )}

                            {stayStatus === 'UPCOMING' && (
                              <button
                                disabled
                                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 text-slate-400 font-bold rounded-xl text-[11px] border border-slate-200 cursor-not-allowed"
                                title={`Check-in baru dibuka tanggal ${formatDate(b.check_in_date)} (Pukul 14:00 WIB)`}
                              >
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Belum Waktunya</span>
                              </button>
                            )}

                            {stayStatus === 'ELIGIBLE' && (
                              <button
                                onClick={() => openCheckInModal(b)}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] shadow-sm transition"
                              >
                                <LogIn className="w-3.5 h-3.5" />
                                <span>Check-In</span>
                              </button>
                            )}
                          </>
                        )}

                        {/* Check-Out Button */}
                        {isCheckedIn && (
                          <button
                            onClick={() => openCheckOutModal(b)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-[11px] shadow-sm transition"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Check-Out</span>
                          </button>
                        )}

                        {/* Cancel Booking Button (super admin only, requires the cancellation key) */}
                        {isSuperAdmin && b.status !== 'CANCELLED' && b.status !== 'CHECKED_OUT' && b.status !== 'NO_SHOW' && (
                          <button
                            type="button"
                            onClick={() => openCancelModal(b)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-[11px] shadow-sm transition"
                            title="Batalkan Reservasi dengan Key Otorisasi Super Admin"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Batalkan</span>
                          </button>
                        )}

                        {/* Download Invoice Button */}
                        {b.status !== 'CANCELLED' && b.status !== 'EXPIRED' && (
                          <button
                            type="button"
                            onClick={() => setInvoiceBooking(b)}
                            className="p-1.5 text-slate-400 hover:text-amber-700 rounded-lg hover:bg-amber-50 transition inline-block align-middle"
                            title="Unduh / Cetak Invoice Resmi (PDF)"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}

                        {/* View Detail Button */}
                        <button
                          onClick={() => {
                            setViewingBooking(b);
                            setDetailModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition inline-block align-middle"
                          title="Lihat Detail Reservasi"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-slate-100 rounded-lg disabled:opacity-40 font-bold"
              >
                Sebelumnya
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 bg-slate-100 rounded-lg disabled:opacity-40 font-bold"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Check-In Modal with Physical Room Unit Assignment & Front Desk Settlement */}
      {checkInModalOpen && selectedBookingForCheckIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex justify-between items-start flex-shrink-0 bg-white">
              <div>
                <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md font-bold border border-amber-200">
                  {selectedBookingForCheckIn.booking_code}
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1.5 flex items-center gap-2">
                  <span>Check-In Tamu:</span>
                  <span className="text-amber-600">{selectedBookingForCheckIn.customer_name}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckInModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body & Form (Scrollable) */}
            <form onSubmit={handleConfirmCheckIn} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {/* Stay Info Card */}
                <div className="p-4 bg-slate-50 rounded-2xl text-xs space-y-2 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Tipe Suite:</span>
                    <span className="font-bold text-slate-900">{selectedBookingForCheckIn.room_type?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Durasi Menginap:</span>
                    <span className="font-bold text-slate-900">{selectedBookingForCheckIn.total_nights || 1} Malam</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Periode:</span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(selectedBookingForCheckIn.check_in_date)} — {formatDate(selectedBookingForCheckIn.check_out_date)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Metode & Tagihan:</span>
                    <span className="font-black text-slate-900 flex items-center gap-1.5">
                      {selectedBookingForCheckIn.payment_method === 'cash' ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-bold border border-amber-200">
                          <Banknote className="w-3 h-3 text-amber-600" />
                          <span>Bayar di Tempat</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-bold border border-blue-200">
                          <CreditCard className="w-3 h-3 text-blue-600" />
                          <span>Midtrans Online</span>
                        </span>
                      )}
                      <span>{formatRupiah(selectedBookingForCheckIn.total_amount)}</span>
                    </span>
                  </div>
                </div>

                {/* Front Desk Payment Settlement for Cash on Arrival */}
                {selectedBookingForCheckIn.payment_method === 'cash' && (
                  <div className="p-4 bg-gradient-to-br from-amber-50/90 to-orange-50/40 border border-amber-200/80 rounded-2xl text-xs space-y-3.5 shadow-sm">
                    <div className="flex items-center justify-between pb-2.5 border-b border-amber-200/70">
                      <div className="flex items-center space-x-2 text-amber-950 font-black">
                        <Banknote className="w-4 h-4 text-amber-600" />
                        <span>Pelunasan Tagihan di Front Desk</span>
                      </div>
                      <span className="text-sm font-black text-amber-900">
                        {formatRupiah(selectedBookingForCheckIn.total_amount)}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-2">
                        Pilih Metode Pembayaran Tamu:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setOfflinePaymentMethod('cash')}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                            offlinePaymentMethod === 'cash'
                              ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400/30'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-slate-50'
                          }`}
                        >
                          <Banknote className={`w-4 h-4 ${offlinePaymentMethod === 'cash' ? 'text-white' : 'text-amber-600'}`} />
                          <span className="text-[11px]">Tunai (Cash)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setOfflinePaymentMethod('qris')}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                            offlinePaymentMethod === 'qris'
                              ? 'bg-teal-600 text-white border-teal-700 shadow-md ring-2 ring-teal-400/30'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                          }`}
                        >
                          <QrCode className={`w-4 h-4 ${offlinePaymentMethod === 'qris' ? 'text-white' : 'text-teal-600'}`} />
                          <span className="text-[11px]">QRIS (EDC)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setOfflinePaymentMethod('debit_card')}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                            offlinePaymentMethod === 'debit_card'
                              ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400/30'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                          }`}
                        >
                          <CreditCard className={`w-4 h-4 ${offlinePaymentMethod === 'debit_card' ? 'text-white' : 'text-blue-600'}`} />
                          <span className="text-[11px]">Kartu Debit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setOfflinePaymentMethod('credit_card')}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                            offlinePaymentMethod === 'credit_card'
                              ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-400/30'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                          }`}
                        >
                          <CreditCard className={`w-4 h-4 ${offlinePaymentMethod === 'credit_card' ? 'text-white' : 'text-purple-600'}`} />
                          <span className="text-[11px]">Kartu Kredit</span>
                        </button>
                      </div>
                    </div>

                    {offlinePaymentMethod !== 'cash' && (
                      <div className="space-y-3 pt-2.5 border-t border-amber-200/80">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-800 mb-1.5">
                            {offlinePaymentMethod === 'qris'
                              ? 'Pilih Mesin EDC Penerima QRIS (Masuk ke Rekening Bank):'
                              : `Pilih Mesin EDC / Bank (${offlinePaymentMethod === 'debit_card' ? 'Debit' : 'Kredit'}):`}
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { id: 'bca', label: 'BCA', activeBg: 'bg-blue-700 text-white border-blue-800 ring-2 ring-blue-600/30' },
                              { id: 'bri', label: 'BRI', activeBg: 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-500/30' },
                              { id: 'btn', label: 'BTN', activeBg: 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-500/30' },
                              { id: 'mandiri', label: 'Mandiri', activeBg: 'bg-sky-800 text-white border-sky-900 ring-2 ring-sky-700/30' },
                            ].map((b) => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => setSelectedBank(b.id)}
                                className={`py-2 px-1 text-center rounded-xl border text-xs font-black transition ${
                                  selectedBank === b.id
                                    ? `${b.activeBg} shadow-sm`
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {b.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-800 mb-1">
                            {offlinePaymentMethod === 'qris'
                              ? 'Nomor Referensi / RRN Bukti QRIS (Opsional):'
                              : 'Nomor Referensi / Approval Code EDC (Opsional):'}
                          </label>
                          <input
                            type="text"
                            value={cardReference}
                            onChange={(e) => setCardReference(e.target.value)}
                            placeholder={
                              offlinePaymentMethod === 'qris'
                                ? 'Contoh: RRN-998231 atau 4 Digit Terakhir Struk'
                                : 'Contoh: BCA-883921 atau 4 Digit Terakhir Struk'
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>

                        {offlinePaymentMethod === 'qris' && (
                          <button
                            type="button"
                            onClick={() => setQrisBooking(selectedBookingForCheckIn)}
                            className="w-full py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Tampilkan & Unduh Gambar QRIS untuk Tamu</span>
                          </button>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-amber-900 font-medium flex items-center gap-1.5 bg-amber-100/70 p-2 rounded-lg">
                      <span className="text-xs">💡</span>
                      <span>Status pembayaran otomatis ditandai <strong>LUNAS</strong> setelah check-in berhasil dikonfirmasi.</span>
                    </p>
                  </div>
                )}

                {/* Room Unit Selection */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-800 flex justify-between items-center">
                    <span>Pilih Unit Kamar Fisik (Status: Ready Clean) *</span>
                    <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {availableRooms.length} kamar ready
                    </span>
                  </label>

                  {availableRooms.length === 0 ? (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                      <p className="font-bold">Tidak ada unit kamar yang berstatus Ready (Tersedia).</p>
                      <p className="text-[11px] text-rose-700">
                        Semua unit kamar tipe ini sedang berstatus <strong>Terisi (Occupied)</strong> atau <strong>Sedang Dibersihkan (Cleaning)</strong>. Silakan periksa status kebersihan kamar di menu Inventaris Kamar terlebih dahulu.
                      </p>
                    </div>
                  ) : (
                    <>
                      <select
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        required
                      >
                        {availableRooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            Unit Kamar #{r.room_number} — Lantai {r.floor} (Siap Pakai / Ready Clean)
                          </option>
                        ))}
                      </select>

                      <p className="text-[11px] text-slate-500 mt-1.5 flex items-center space-x-1">
                        <span>ℹ️</span>
                        <span>Unit kamar yang dipilih akan otomatis berubah statusnya menjadi <strong>Terisi (Occupied)</strong>.</span>
                      </p>
                    </>
                  )}

                  {allRoomsOfType.length > availableRooms.length && (
                    <div className="mt-2 p-2.5 bg-slate-100 rounded-xl text-[11px] text-slate-600">
                      Total unit tipe ini: {allRoomsOfType.length} kamar ({allRoomsOfType.length - availableRooms.length} kamar sedang terisi / dalam pembersihan).
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Modal Action Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end space-x-2.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setCheckInModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={checkingIn || availableRooms.length === 0}
                  className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {checkingIn ? (
                    <span>Memproses...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Konfirmasi Check-In Tamu</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Check-Out Confirmation Modal */}
      <ConfirmModal
        isOpen={checkOutModalOpen}
        onClose={() => setCheckOutModalOpen(false)}
        onConfirm={handleConfirmCheckOut}
        loading={checkingOut}
        type="warning"
        title="Konfirmasi Check-Out Tamu"
        message={`Tamu ${selectedBookingForCheckOut?.customer_name} akan check-out dari Kamar #${(selectedBookingForCheckOut?.assigned_room || selectedBookingForCheckOut?.room)?.room_number || ''} (Jadwal Maksimal Check-Out: 12:00 WIB). Waktu check-out aktual dicatat ke sistem dan status fisik unit kamar dialihkan menjadi "Pembersihan (Cleaning)".`}
        confirmText="Check-Out Tamu Sekarang"
        cancelText="Batal"
      />

      {/* Detailed Booking Modal */}
      {detailModalOpen && viewingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md font-bold">
                  {viewingBooking.booking_code}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2">
                  Detail Reservasi Hotel
                </h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Tamu:</span>
                  <span className="font-bold text-slate-900">{viewingBooking.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-bold text-slate-900">{viewingBooking.customer_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Telepon:</span>
                  <span className="font-bold text-slate-900">{viewingBooking.customer_phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipe Suite:</span>
                  <span className="font-bold text-slate-900">{viewingBooking.room_type?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Check-In:</span>
                  <span className="font-bold text-slate-900">{formatDate(viewingBooking.check_in_date)} Pukul 14:00 WIB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Check-Out:</span>
                  <span className="font-bold text-amber-900">
                    {formatCheckoutTime(viewingBooking.check_out_date, viewingBooking.checked_out_at)}
                  </span>
                </div>
                {viewingBooking.room && (
                  <div className="flex justify-between text-indigo-700 font-bold pt-1 border-t border-slate-200">
                    <span>Unit Kamar:</span>
                    <span>#{viewingBooking.room.room_number} (Lt. {viewingBooking.room.floor})</span>
                  </div>
                )}
              </div>

              {viewingBooking.special_requests && (
                <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl">
                  <span className="font-bold text-amber-900 block mb-1">Permintaan Khusus Tamu:</span>
                  <p className="text-slate-700 italic">"{viewingBooking.special_requests}"</p>
                </div>
              )}

              {/* Extra Items */}
              {viewingBooking.extra_items && viewingBooking.extra_items.length > 0 && (
                <div className="p-4 border border-slate-100 rounded-2xl space-y-1.5">
                  <span className="font-bold text-slate-900 block">Layanan Tambahan (Add-Ons):</span>
                  {viewingBooking.extra_items.map((extra) => (
                    <div key={extra.id} className="flex justify-between text-[11px] text-slate-600">
                      <span>• {extra.extra_service?.name || extra.service_name} (x{extra.quantity})</span>
                      <span className="font-semibold text-slate-900">{formatRupiah(extra.subtotal)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Discount Promo */}
              {Number(viewingBooking.discount_amount || 0) > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-900">
                    Diskon Kupon Promo ({viewingBooking.discount_code}):
                  </span>
                  <span className="font-black text-emerald-700">
                    -{formatRupiah(viewingBooking.discount_amount)}
                  </span>
                </div>
              )}

              <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="font-black text-slate-900 block">Total Tagihan:</span>
                  <div className="mt-1">
                    {renderPaymentBadge(viewingBooking)}
                  </div>
                </div>
                <span className="text-base font-black text-amber-800">{formatRupiah(viewingBooking.total_amount)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setInvoiceBooking(viewingBooking)}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Unduh Invoice (PDF)</span>
                </button>

                {viewingBooking.status === 'PENDING_PAYMENT' && (
                  <button
                    type="button"
                    onClick={() => setQrisBooking(viewingBooking)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Unduh QRIS</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setDetailModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition text-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal with Super Admin Authorization Key */}
      {cancelModalOpen && selectedBookingForCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Otorisasi Pembatalan Reservasi
                  </h3>
                  <span className="text-[10px] text-rose-600 font-mono font-bold block">
                    Memerlukan Key Super Admin
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Booking Info Preview */}
            <div className="p-4 bg-slate-50 rounded-2xl text-xs space-y-1.5 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Kode Booking:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedBookingForCancel.booking_code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Tamu:</span>
                <span className="font-bold text-slate-900">
                  {selectedBookingForCancel.customer_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tipe Suite:</span>
                <span className="font-bold text-slate-900">
                  {selectedBookingForCancel.room_type?.name || selectedBookingForCancel.service_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Biaya:</span>
                <span className="font-black text-amber-700">
                  {formatRupiah(selectedBookingForCancel.total_amount)}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmCancelWithKey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Pembatalan *
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold mb-2"
                >
                  <option value="Permintaan pembatalan langsung oleh tamu">Permintaan pembatalan langsung oleh tamu</option>
                  <option value="Reschedule / Perubahan tanggal liburan">Reschedule / Perubahan tanggal liburan</option>
                  <option value="Kendala penerbangan / transportasi tamu">Kendala penerbangan / transportasi tamu</option>
                  <option value="Pembatalan oleh Front Desk / Manajemen Hotel">Pembatalan oleh Front Desk / Manajemen Hotel</option>
                  <option value="Lainnya">Alasan Lainnya</option>
                </select>
                {cancelReason === 'Lainnya' && (
                  <input
                    type="text"
                    placeholder="Tuliskan alasan pembatalan..."
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span>Key Konfirmasi Super Admin *</span>
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Wajib Otorisasi
                  </span>
                </label>
                <input
                  type="text"
                  value={cancellationKeyInput}
                  onChange={(e) => setCancellationKeyInput(e.target.value)}
                  placeholder="Contoh: ROYAL-CANCEL-8888"
                  className="w-full text-xs p-3 rounded-xl border border-amber-300 bg-amber-50/40 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono font-bold tracking-wider text-slate-900 placeholder:text-slate-400"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                  Key ini hanya dapat digenerate dan dilihat melalui profil <strong>Super Admin / General Manager</strong> (Tombol <em>Key Otorisasi Batal</em> di navbar atas).
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{cancelling ? 'Memverifikasi...' : 'Verifikasi & Batalkan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceBooking && (
        <InvoiceModal
          isOpen={!!invoiceBooking}
          onClose={() => setInvoiceBooking(null)}
          booking={invoiceBooking}
        />
      )}

      {/* QRIS Download Modal */}
      {qrisBooking && (
        <QrisDownloadModal
          isOpen={!!qrisBooking}
          onClose={() => setQrisBooking(null)}
          booking={qrisBooking}
          grossAmount={qrisBooking?.total_amount}
          bank={selectedBank ? selectedBank.toUpperCase() : 'EDC'}
        />
      )}
    </div>
  );
}
