import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatRupiah, formatDateTime, PAYMENT_STATUS_CONFIG } from '../../utils/format';
import { Search, Eye, Undo2 } from 'lucide-react';

// The refund of this payment that is still waiting to be processed, if any
const pendingRefundOf = (payment) => (payment.refunds || []).find((r) => r.status === 'PENDING');

export default function AdminPaymentsPage() {
  const toast = useToast();
  const [refundTarget, setRefundTarget] = useState(null);
  const [processingRefund, setProcessingRefund] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await adminService.getPayments(params);
      if (res.data?.data) {
        setPayments(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPayments();
  };

  const handleProcessRefund = async () => {
    const refund = refundTarget && pendingRefundOf(refundTarget);
    if (!refund) return;

    setProcessingRefund(true);
    try {
      const res = await adminService.processRefund(refund.id);
      toast.success(res.message || 'Refund berhasil diproses.');
      setRefundTarget(null);
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memproses refund.');
    } finally {
      setProcessingRefund(false);
    }
  };

  const pendingRefundCount = payments.filter((p) => pendingRefundOf(p)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Transaksi Pembayaran Midtrans</h1>
          <p className="text-sm text-slate-500 mt-1">Audit log seluruh transaksi online gateway dan status verifikasi.</p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
          >
            <option value="">Semua Status</option>
            <option value="PAID">PAID (Lunas)</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="REFUND_PENDING">MENUNGGU REFUND</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>

          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Order ID / Kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </form>
        </div>
      </div>

      {pendingRefundCount > 0 && (
        <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-xs text-orange-900 flex items-center justify-between gap-3">
          <span className="flex items-center space-x-2">
            <Undo2 className="w-4 h-4 text-orange-600" />
            <span>
              <strong>{pendingRefundCount} refund</strong> menunggu diproses. Klik &quot;Proses Refund&quot; pada baris
              terkait untuk mengembalikan dana ke tamu lewat Midtrans.
            </span>
          </span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Memuat transaksi...</div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">Belum ada transaksi pembayaran.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Order ID</th>
                  <th className="px-6 py-3.5 text-left">Kode Booking</th>
                  <th className="px-6 py-3.5 text-left">Pelanggan</th>
                  <th className="px-6 py-3.5 text-left">Metode</th>
                  <th className="px-6 py-3.5 text-left">Nominal</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                  <th className="px-6 py-3.5 text-left">Waktu Bayar</th>
                  <th className="px-6 py-3.5 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const statusCfg = PAYMENT_STATUS_CONFIG[p.status] || PAYMENT_STATUS_CONFIG.PENDING;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4 font-mono font-bold text-xs text-slate-900 whitespace-nowrap">
                        {p.order_id}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-indigo-600 whitespace-nowrap font-semibold">
                        {p.booking?.booking_code || '-'}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">
                        {p.booking?.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-semibold uppercase">
                        {p.payment_type || 'Snap'}
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-900 whitespace-nowrap">
                        {formatRupiah(p.gross_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap text-xs">
                        {p.paid_at ? formatDateTime(p.paid_at) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {pendingRefundOf(p) && (
                          <button
                            onClick={() => setRefundTarget(p)}
                            className="mr-2 inline-flex items-center space-x-1 px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold rounded-xl text-[11px] transition"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            <span>Proses Refund</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedPayment(p)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                          title="Inspeksi Data"
                        >
                          <Eye className="w-4 h-4" />
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

      <ConfirmModal
        isOpen={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        onConfirm={handleProcessRefund}
        loading={processingRefund}
        type="warning"
        title="Proses Refund?"
        message={
          refundTarget
            ? `Kembalikan ${formatRupiah(pendingRefundOf(refundTarget)?.amount)} untuk booking ${
                refundTarget.booking?.booking_code || '-'
              } (${refundTarget.order_id}) lewat Midtrans. Tindakan ini tidak bisa dibatalkan.`
            : ''
        }
        confirmText="Ya, Proses Refund"
        cancelText="Batal"
      />

      {/* Inspect Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Detail Transaksi Midtrans</h3>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono font-bold text-slate-900">{selectedPayment.order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Midtrans Transaction ID:</span>
                <span className="font-mono text-slate-900">{selectedPayment.transaction_id || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Provider:</span>
                <span className="font-semibold text-slate-900">{selectedPayment.provider_status || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fraud Status:</span>
                <span className="font-semibold text-slate-900">{selectedPayment.fraud_status || '-'}</span>
              </div>

              <div>
                <span className="text-slate-500 block mb-1 font-semibold">Response Payload Terakhir:</span>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[11px] max-h-48 font-mono">
                  {JSON.stringify(selectedPayment.provider_response || {}, null, 2)}
                </pre>
              </div>
            </div>

            <button
              onClick={() => setSelectedPayment(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

