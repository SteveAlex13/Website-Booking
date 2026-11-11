import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import api from '../../services/api';
import { formatRupiah, formatDate, BOOKING_STATUS_CONFIG } from '../../utils/format';
import { CheckCircle2, Clock, AlertCircle, RefreshCw, ArrowRight, Hotel, Calendar } from 'lucide-react';

export default function PaymentResultPage() {
  const { paymentId } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState('');

  const fetchPayment = async () => {
    try {
      try {
        await paymentService.checkStatus(paymentId);
      } catch (e) {
        console.warn('Check midtrans status background notice:', e);
      }

      const res = await paymentService.getPayment(paymentId);
      const paymentData = res.data || res;
      if (paymentData && (paymentData.id || paymentData.order_id)) {
        setPayment(paymentData);
      } else {
        setError('Data pembayaran tidak ditemukan.');
      }
    } catch (err) {
      console.error('Fetch payment error:', err);
      setError(err.response?.data?.message || 'Gagal memuat status pembayaran.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayment();
  }, [paymentId]);

  const handleCheckStatus = async () => {
    setRefreshing(true);
    try {
      await paymentService.checkStatus(paymentId);
      await fetchPayment();
    } catch (err) {
      console.error(err);
      setRefreshing(false);
    }
  };

  // Development sandbox helper: simulate instant settlement
  const handleSimulatePayment = async () => {
    if (!payment) return;
    setSimulating(true);
    try {
      await api.post('/webhooks/midtrans', {
        order_id: payment.order_id,
        status_code: '200',
        gross_amount: Math.round(payment.gross_amount).toFixed(2),
        signature_key: 'SIMULATED_SIGNATURE',
        transaction_status: 'settlement',
        payment_type: 'qris',
        transaction_id: 'SIM-' + Date.now(),
      });
      await fetchPayment();
    } catch (err) {
      alert('Simulasi gagal: ' + (err.response?.data?.message || err.message));
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-600 border-t-transparent mx-auto"></div>
        <p className="text-slate-500 text-xs mt-3">Memeriksa status transaksi pembayaran hotel...</p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center">
        <p className="text-rose-600 font-bold">{error || 'Data pembayaran tidak ditemukan.'}</p>
      </div>
    );
  }

  const isPaid = payment.status === 'PAID';
  const booking = payment.booking;
  const statusCfg = BOOKING_STATUS_CONFIG[booking?.status] || BOOKING_STATUS_CONFIG.PENDING_PAYMENT;
  const roomName = booking?.room_type?.name || booking?.service_name || 'Luxury Suite';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-6">
        {/* Status Icon */}
        <div className="flex justify-center">
          {isPaid ? (
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-10 h-10" />
            </div>
          )}
        </div>

        {/* Status Heading */}
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {isPaid ? 'Pembayaran Berhasil Diverifikasi!' : 'Menunggu Konfirmasi Pembayaran'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {isPaid
              ? 'Terima kasih, reservasi kamar suite Anda telah resmi dikonfirmasi dan diamankan.'
              : 'Silakan selesaikan pembayaran QRIS / Virtual Account Anda sebelum waktu habis.'}
          </p>
        </div>

        {/* Receipt Box */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left space-y-3 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Kode Reservasi:</span>
            <span className="font-mono font-bold text-slate-900">{booking?.booking_code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Order ID Midtrans:</span>
            <span className="font-mono text-slate-700">{payment.order_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tipe Suite:</span>
            <span className="font-bold text-slate-900">{roomName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Periode Menginap:</span>
            <span className="font-bold text-slate-900">
              {formatDate(booking?.check_in_date)} — {formatDate(booking?.check_out_date)} ({booking?.total_nights || 1} Malam)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status Reservasi:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
            >
              {statusCfg.label}
            </span>
          </div>
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm">
            <span className="font-bold text-slate-700">Total Nominal Lunas:</span>
            <span className="text-xl font-black text-amber-700">
              {formatRupiah(payment.gross_amount)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {!isPaid && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={refreshing}
                onClick={handleCheckStatus}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition flex items-center justify-center space-x-2 text-xs"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Cek Status Midtrans</span>
              </button>

              <button
                type="button"
                disabled={simulating}
                onClick={handleSimulatePayment}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition flex items-center justify-center space-x-2 text-xs"
                title="Gunakan ini untuk langsung mengonfirmasi pembayaran di environment pengujian/sandbox"
              >
                {simulating ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                ) : (
                  <span>Simulasi Bayar QRIS Berhasil</span>
                )}
              </button>
            </div>
          )}

          <Link
            to="/customer/dashboard"
            className="block w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-md transition text-center text-xs"
          >
            Buka Dashboard Reservasi Saya
          </Link>
        </div>
      </div>
    </div>
  );
}
