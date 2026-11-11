import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';
import { paymentService } from '../../services/paymentService';
import { useToast } from '../../contexts/ToastContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatRupiah, formatDate, BOOKING_STATUS_CONFIG } from '../../utils/format';
import { loadSnapScript, openSnapModal } from '../../utils/midtrans';
import {
  Calendar,
  CreditCard,
  XCircle,
  Eye,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Hotel,
  DoorOpen,
  Coffee,
  Users,
} from 'lucide-react';

const CANCELLATION_REASONS = [
  'Perubahan tanggal rencana liburan',
  'Ada keperluan mendadak / berhalangan hadir',
  'Ingin memilih tipe kamar atau suite lain',
  'Kendala transportasi / penerbangan',
  'Lainnya',
];

export default function CustomerDashboardPage() {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'HISTORY'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Modal Cancel State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASONS[0]);
  const [cancelling, setCancelling] = useState(false);

  // Paying State
  const [payingId, setPayingId] = useState(null);

  const fetchBookings = async () => {
    try {
      const res = await bookingService.getMyBookings();
      if (res.data?.data) {
        setBookings(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat riwayat reservasi hotel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleOpenCancelModal = (booking) => {
    setBookingToCancel(booking);
    setCancelReason(CANCELLATION_REASONS[0]);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    setCancelling(true);
    try {
      await bookingService.cancelBooking(bookingToCancel.id, cancelReason);
      toast.success('Reservasi kamar berhasil dibatalkan. Kuota kamar telah dilepas.');
      setCancelModalOpen(false);
      setBookingToCancel(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membatalkan reservasi.');
    } finally {
      setCancelling(false);
    }
  };

  const handlePayNow = async (booking) => {
    setPayingId(booking.id);
    try {
      const checkoutRes = await paymentService.checkout(booking.id);
      const { snap_token, client_key, payment_id } = checkoutRes.data;

      const isProduction = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true';
      await loadSnapScript(client_key || import.meta.env.VITE_MIDTRANS_CLIENT_KEY, isProduction);

      if (snap_token.startsWith('SIMULATED_') || snap_token.startsWith('SANDBOX_FALLBACK_')) {
        window.location.href = `/payment-result/${payment_id}`;
        return;
      }

      openSnapModal(snap_token, {
        onSuccess: () => {
          toast.success('Pembayaran sukses terverifikasi!');
          window.location.href = `/payment-result/${payment_id}`;
        },
        onPending: () => {
          toast.info('Menunggu penyelesaian pembayaran QRIS.');
          fetchBookings();
        },
        onError: () => {
          toast.error('Pembayaran gagal atau dibatalkan.');
          fetchBookings();
        },
        onClose: () => {
          fetchBookings();
        },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuka pembayaran Midtrans.');
    } finally {
      setPayingId(null);
    }
  };

  const copyBookingCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.info(`Kode Reservasi ${code} disalin!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeBookings = bookings.filter(
    (b) =>
      b.status === 'PENDING_PAYMENT' ||
      b.status === 'CONFIRMED' ||
      b.status === 'CHECKED_IN'
  );
  const historyBookings = bookings.filter(
    (b) =>
      b.status !== 'PENDING_PAYMENT' &&
      b.status !== 'CONFIRMED' &&
      b.status !== 'CHECKED_IN'
  );

  const displayedBookings =
    filterTab === 'ACTIVE'
      ? activeBookings
      : filterTab === 'HISTORY'
      ? historyBookings
      : bookings;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 p-8 rounded-3xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold backdrop-blur-sm">
            <Hotel className="w-3.5 h-3.5" />
            <span>Portal Reservasi Tamu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Riwayat & Status Menginap</h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            Pantau reservasi suite Anda, selesaikan pembayaran QRIS Midtrans, atau kelola permohonan pembatalan.
          </p>
        </div>
        <Link
          to="/services"
          className="inline-flex items-center space-x-2 px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-amber-900/40 transition transform hover:-translate-y-0.5 text-xs self-start sm:self-auto"
        >
          <span>+ Pesan Suite Lain</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div
          onClick={() => setFilterTab('ALL')}
          className={`cursor-pointer bg-white p-6 rounded-2xl border transition shadow-sm hover:shadow-md ${
            filterTab === 'ALL' ? 'border-amber-600 ring-2 ring-amber-600/20' : 'border-slate-200'
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Reservasi</span>
          <p className="text-3xl font-black text-slate-900 mt-2">{bookings.length}</p>
          <span className="text-xs text-slate-400 mt-1 block">Semua riwayat menginap</span>
        </div>

        <div
          onClick={() => setFilterTab('ACTIVE')}
          className={`cursor-pointer bg-white p-6 rounded-2xl border transition shadow-sm hover:shadow-md ${
            filterTab === 'ACTIVE' ? 'border-amber-600 ring-2 ring-amber-600/20' : 'border-slate-200'
          }`}
        >
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Menginap Aktif</span>
          <p className="text-3xl font-black text-amber-700 mt-2">{activeBookings.length}</p>
          <span className="text-xs text-amber-600/80 mt-1 block">Menunggu bayar, konfirmasi, & check-in</span>
        </div>

        <div
          onClick={() => setFilterTab('HISTORY')}
          className={`cursor-pointer bg-white p-6 rounded-2xl border transition shadow-sm hover:shadow-md ${
            filterTab === 'HISTORY' ? 'border-amber-600 ring-2 ring-amber-600/20' : 'border-slate-200'
          }`}
        >
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Riwayat Selesai / Batal</span>
          <p className="text-3xl font-black text-slate-700 mt-2">{historyBookings.length}</p>
          <span className="text-xs text-slate-400 mt-1 block">Checkout terdahulu & dibatalkan</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilterTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            filterTab === 'ALL'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Semua ({bookings.length})
        </button>
        <button
          onClick={() => setFilterTab('ACTIVE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            filterTab === 'ACTIVE'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Aktif ({activeBookings.length})
        </button>
        <button
          onClick={() => setFilterTab('HISTORY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            filterTab === 'HISTORY'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Riwayat ({historyBookings.length})
        </button>
      </div>

      {/* Bookings Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent mx-auto mb-2"></div>
          Memuat daftar reservasi kamar...
        </div>
      ) : displayedBookings.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-4">
          <Hotel className="w-12 h-12 text-slate-400 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-800 text-base">Belum Ada Reservasi</h3>
            <p className="text-xs text-slate-400 mt-1">
              Rencanakan liburan mewah Anda di The Royal Nusantara Resort sekarang.
            </p>
          </div>
          <Link
            to="/services"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <span>Pilih Kamar & Suite</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedBookings.map((b) => {
            const statusCfg = BOOKING_STATUS_CONFIG[b.status] || BOOKING_STATUS_CONFIG.PENDING_PAYMENT;
            const isPending = b.status === 'PENDING_PAYMENT';
            const isConfirmed = b.status === 'CONFIRMED';
            const isCheckedIn = b.status === 'CHECKED_IN';
            const roomName = b.room_type?.name || b.service_name || 'Luxury Suite';

            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
              >
                {/* Header Card */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100 flex items-center space-x-1.5">
                        <span>{b.booking_code}</span>
                      </span>
                      <button
                        onClick={() => copyBookingCode(b.booking_code, b.id)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                        title="Salin Kode Reservasi"
                      >
                        {copiedId === b.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                    >
                      {statusCfg.label}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mt-3 group-hover:text-amber-600 transition">
                    {roomName}
                  </h3>

                  {/* Dates & Nights Info */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-semibold text-slate-800">
                        {formatDate(b.check_in_date)} — {formatDate(b.check_out_date)}
                      </span>
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold">
                        {b.total_nights || 1} Malam
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {b.total_adults} Dewasa{b.total_children > 0 ? `, ${b.total_children} Anak` : ''}
                      </span>
                    </div>

                    {b.room?.room_number && (
                      <div className="flex items-center space-x-2 text-indigo-700 font-bold">
                        <DoorOpen className="w-3.5 h-3.5" />
                        <span>Kamar Fisik: Unit #{b.room.room_number} (Lt. {b.room.floor})</span>
                      </div>
                    )}
                  </div>

                  {/* Pending payment notice */}
                  {isPending && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-800 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      <span>Batas pembayaran 15 menit. Kamar diamankan sementara untuk Anda.</span>
                    </div>
                  )}

                  {isConfirmed && (
                    <div className="mt-3 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-800 flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Pembayaran lunas. Kamar Anda siap dihuni pada tanggal check-in (14:00).</span>
                    </div>
                  )}

                  {isCheckedIn && (
                    <div className="mt-3 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 text-[11px] text-indigo-800 flex items-center space-x-2">
                      <DoorOpen className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <span>Sedang Menginap. Selamat menikmati fasilitas resort!</span>
                    </div>
                  )}
                </div>

                {/* Footer Card with Action */}
                <div className="p-6 pt-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                      Total Biaya Inap
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {formatRupiah(b.total_amount)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenCancelModal(b)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
                        >
                          Batalkan
                        </button>
                        <button
                          type="button"
                          disabled={payingId === b.id}
                          onClick={() => handlePayNow(b)}
                          className="px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-xl shadow-md shadow-amber-600/30 transition flex items-center space-x-1.5"
                        >
                          {payingId === b.id ? (
                            <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                          ) : (
                            <>
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Bayar QRIS</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedBooking(b)}
                      className="p-2 text-slate-400 hover:text-amber-700 hover:bg-white rounded-xl transition border border-transparent hover:border-slate-200"
                      title="Lihat Voucher & Tiket"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enhanced Custom Cancellation Modal */}
      <ConfirmModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        loading={cancelling}
        type="danger"
        title="Batalkan Reservasi Kamar?"
        message={`Apakah Anda yakin ingin membatalkan reservasi (${bookingToCancel?.booking_code}) untuk suite ${bookingToCancel?.room_type?.name || bookingToCancel?.service_name}? Kamar akan segera dikembalikan ke inventaris publik.`}
        confirmText="Ya, Batalkan Reservasi"
        cancelText="Kembali"
        reason={cancelReason}
        setReason={setCancelReason}
        reasonsList={CANCELLATION_REASONS}
      />

      {/* Modal Voucher & Detail Reservasi */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md font-bold">
                  {selectedBooking.booking_code}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  {selectedBooking.room_type?.name || selectedBooking.service_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl">
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Check-In</span>
                  <span className="font-bold text-slate-900">{formatDate(selectedBooking.check_in_date)} (14:00)</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Check-Out</span>
                  <span className="font-bold text-slate-900">{formatDate(selectedBooking.check_out_date)} (12:00)</span>
                </div>
              </div>

              <div className="space-y-1.5 p-4 border border-slate-100 rounded-2xl">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Tamu:</span>
                  <span className="font-bold text-slate-900">{selectedBooking.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-bold text-slate-900">{selectedBooking.customer_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Telepon:</span>
                  <span className="font-bold text-slate-900">{selectedBooking.customer_phone || '-'}</span>
                </div>
                {selectedBooking.room?.room_number && (
                  <div className="flex justify-between text-indigo-700 font-bold pt-1 border-t border-slate-100">
                    <span>Nomor Unit Kamar:</span>
                    <span>Kamar #{selectedBooking.room.room_number} (Lt. {selectedBooking.room.floor})</span>
                  </div>
                )}
              </div>

              {/* Extra Items */}
              {selectedBooking.extra_items && selectedBooking.extra_items.length > 0 && (
                <div className="p-4 border border-slate-100 rounded-2xl space-y-2">
                  <span className="font-bold text-slate-900 text-xs block">Layanan Tambahan (Add-Ons):</span>
                  {selectedBooking.extra_items.map((extra) => (
                    <div key={extra.id} className="flex justify-between text-[11px] text-slate-600">
                      <span>• {extra.extra_service?.name || extra.service_name} (x{extra.quantity})</span>
                      <span className="font-semibold text-slate-900">{formatRupiah(extra.subtotal)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Price Breakdown */}
              <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-2xl space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Biaya Kamar:</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(selectedBooking.room_amount || selectedBooking.total_amount * 0.9)}</span>
                </div>
                {Number(selectedBooking.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                    <span>Diskon Kupon Promo ({selectedBooking.discount_code}):</span>
                    <span>-{formatRupiah(selectedBooking.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Pajak & Layanan Hotel (10%):</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(selectedBooking.tax_amount || selectedBooking.total_amount * 0.1)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-amber-200">
                  <span>Total Tagihan:</span>
                  <span className="text-amber-800">{formatRupiah(selectedBooking.total_amount)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                Tutup Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
