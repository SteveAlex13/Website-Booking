import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import { formatRupiah, formatDateTime, PAYMENT_STATUS_CONFIG } from '../../utils/format';
import {
  Search,
  Eye,
  Banknote,
  CreditCard,
  QrCode,
  CheckCircle2,
  Clock,
  X,
  Receipt,
} from 'lucide-react';

const formatPaymentType = (p) => {
  const type = (p.payment_type || '').toLowerCase();
  if (type === 'cash') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
        <Banknote className="w-3 h-3 text-emerald-600" />
        <span>Tunai (Front Desk)</span>
      </span>
    );
  }
  if (type.startsWith('qris_') || type === 'qris') {
    const bank = type.replace('qris_', '').toUpperCase();
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
        <QrCode className="w-3 h-3 text-teal-600" />
        <span>QRIS {bank !== 'QRIS' ? bank : 'Digital'}</span>
      </span>
    );
  }
  if (type.startsWith('debit_')) {
    const bank = type.replace('debit_', '').toUpperCase();
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
        <CreditCard className="w-3 h-3 text-blue-600" />
        <span>Debit {bank} (EDC)</span>
      </span>
    );
  }
  if (type.startsWith('credit_') || type === 'credit_card') {
    const bank = type.startsWith('credit_') ? type.replace('credit_', '').toUpperCase() : 'Online';
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
        <CreditCard className="w-3 h-3 text-purple-600" />
        <span>CC {bank}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 uppercase">
      {p.payment_type || 'Snap'}
    </span>
  );
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);

  const fetchPayments = async (overrideParams = {}) => {
    setLoading(true);
    try {
      const params = {
        status: statusFilter || undefined,
        search: search.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        ...overrideParams,
      };

      // Clean undefined keys
      Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);

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

  const handleDateSubmit = (e) => {
    e.preventDefault();
    fetchPayments();
  };

  const applyQuickPreset = (preset) => {
    const now = new Date();
    let start = '';
    let end = '';
    if (preset === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      end = now.toISOString().split('T')[0];
    } else if (preset === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    } else if (preset === '7_days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
      end = now.toISOString().split('T')[0];
    } else if (preset === '30_days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
      end = now.toISOString().split('T')[0];
    }
    setStartDate(start);
    setEndDate(end);
    fetchPayments({ start_date: start, end_date: end });
  };

  const handleResetDate = () => {
    setStartDate('');
    setEndDate('');
    fetchPayments({ start_date: undefined, end_date: undefined });
  };

  const paidCount = payments.filter((p) => p.status === 'PAID').length;
  const paidTotal = payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + Number(p.gross_amount || 0), 0);
  const pendingCount = payments.filter((p) => p.status === 'PENDING').length;

  const statusTabs = [
    { key: '', label: 'Semua Status' },
    { key: 'PAID', label: 'Lunas (PAID)' },
    { key: 'PENDING', label: 'Menunggu Bayar' },
    { key: 'CANCELLED', label: 'Dibatalkan' },
    { key: 'EXPIRED', label: 'Kedaluwarsa' },
  ];

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Transaksi & Pelunasan Pembayaran</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring mutasi pembayaran online Midtrans Snap & pelunasan kasir Front Desk hotel.
          </p>
        </div>
      </div>

      {/* Mini KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Lunas (Tercatat)
            </span>
            <p className="text-lg font-black text-emerald-600 mt-0.5">
              {formatRupiah(paidTotal)}
            </p>
            <span className="text-[10px] text-slate-500 font-semibold">
              {paidCount} transaksi berhasil
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Menunggu Pelunasan
            </span>
            <p className="text-lg font-black text-amber-600 mt-0.5">
              {pendingCount} Transaksi
            </p>
            <span className="text-[10px] text-slate-500 font-semibold">
              Status PENDING pembayaran
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Transaksi Tercatat
            </span>
            <p className="text-lg font-black text-indigo-600 mt-0.5">
              {payments.length} Transaksi
            </p>
            <span className="text-[10px] text-slate-500 font-semibold">
              Pada filter & periode aktif
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Receipt className="w-4 h-4 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar (Pill Tabs + Date Presets) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        {/* Status Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-white text-amber-700' : 'bg-orange-500 text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Date Filter & Presets (Mirip Laporan Finansial) */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Quick Presets */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Rentang:</span>
            {[
              { key: 'this_month', label: 'Bulan Ini' },
              { key: 'last_month', label: 'Bulan Lalu' },
              { key: '7_days', label: '7 Hari' },
              { key: '30_days', label: '30 Hari' },
            ].map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyQuickPreset(preset.key)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={handleResetDate}
                className="px-2 py-1 text-xs font-bold text-rose-600 hover:underline ml-1 whitespace-nowrap"
              >
                Reset Tanggal
              </button>
            )}
          </div>

          {/* Date Form Inputs */}
          <form onSubmit={handleDateSubmit} className="flex flex-wrap items-center gap-2 self-end md:self-auto">
            <div className="flex items-center space-x-1 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-1 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
            >
              Filter
            </button>
          </form>
        </div>

        {/* Keyword Search Form */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          <form onSubmit={handleSearch} className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari order ID, kode booking, tamu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchPayments({ search: undefined });
                }}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap hidden sm:inline-block">
            Menampilkan {payments.length} transaksi
          </span>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Memuat data transaksi pembayaran...</div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">Belum ada transaksi pembayaran pada filter ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Order ID</th>
                  <th className="px-4 py-3 text-left">Kode Booking</th>
                  <th className="px-4 py-3 text-left">Pelanggan</th>
                  <th className="px-4 py-3 text-left">Metode Pembayaran</th>
                  <th className="px-4 py-3 text-left">Nominal</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Waktu Bayar</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const statusCfg = PAYMENT_STATUS_CONFIG[p.status] || PAYMENT_STATUS_CONFIG.PENDING;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-mono font-bold text-xs text-slate-900 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {p.order_id}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-indigo-600 whitespace-nowrap font-bold">
                        <span className="bg-indigo-50/70 px-2 py-0.5 rounded-md">
                          {p.booking?.booking_code || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                        {p.booking?.customer_name || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatPaymentType(p)}
                      </td>
                      <td className="px-4 py-3 font-black text-slate-900 whitespace-nowrap">
                        {formatRupiah(p.gross_amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border || 'border-transparent'}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {p.paid_at ? formatDateTime(p.paid_at) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedPayment(p)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[10px] transition"
                          title="Lihat Detail Transaksi"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Detail</span>
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

      {/* Inspect Modal - Opsi 3: Minimalis & Ringkas */}
      {selectedPayment && (() => {
        const statusCfg = PAYMENT_STATUS_CONFIG[selectedPayment.status] || PAYMENT_STATUS_CONFIG.PENDING;
        const booking = selectedPayment.booking;
        const resp = selectedPayment.provider_response || {};

        let paymentLabel = 'Midtrans Gateway';
        const type = (selectedPayment.payment_type || '').toLowerCase();
        if (type === 'cash') {
          paymentLabel = 'Tunai / Kasir Front Desk';
        } else if (type === 'credit_card') {
          const cardNum = resp.masked_card ? ` (${resp.masked_card})` : '';
          paymentLabel = `Kartu Kredit${cardNum}`;
        } else if (type === 'gopay') {
          paymentLabel = 'GoPay / QRIS';
        } else if (type === 'qris' || type.startsWith('qris_')) {
          paymentLabel = 'QRIS Digital';
        } else if (type === 'bank_transfer') {
          const bankName = resp.va_numbers?.[0]?.bank?.toUpperCase() || resp.bank?.toUpperCase() || 'Bank';
          paymentLabel = `Virtual Account (${bankName})`;
        } else if (type.startsWith('debit_')) {
          paymentLabel = `Debit EDC (${type.replace('debit_', '').toUpperCase()})`;
        } else if (type.startsWith('credit_')) {
          paymentLabel = `Kartu Kredit EDC (${type.replace('credit_', '').toUpperCase()})`;
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100">
              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Detail Transaksi Pembayaran</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Ringkasan status pelunasan transaksi hotel</p>
                </div>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
                >
                  ✕
                </button>
              </div>

              {/* Total Nominal & Status Pill */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block">Total Pembayaran</span>
                  <span className="text-xl font-black text-slate-900">
                    {formatRupiah(selectedPayment.gross_amount)}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${statusCfg.bg} ${statusCfg.text} border`}>
                    {statusCfg.label}
                  </span>
                </div>
              </div>

              {/* Informasi Rinci (Minimalis & Jelas) */}
              <div className="space-y-3 text-xs divide-y divide-slate-100">
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-500 font-medium">No. Referensi (Order ID)</span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-[11px]">
                    {selectedPayment.order_id}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-500 font-medium">Kode Reservasi</span>
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {booking?.booking_code || '-'}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-500 font-medium">Nama Tamu</span>
                  <span className="font-bold text-slate-900">
                    {booking?.customer_name || '-'}
                  </span>
                </div>

                {booking?.roomType?.name && (
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-500 font-medium">Tipe Kamar</span>
                    <span className="font-semibold text-slate-700 text-right">
                      {booking.roomType.name}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-500 font-medium">Metode Pembayaran</span>
                  <span className="font-bold text-slate-800 text-right">
                    {paymentLabel}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-500 font-medium">Waktu Pelunasan</span>
                  <span className="text-slate-700 font-semibold text-right">
                    {selectedPayment.paid_at
                      ? formatDateTime(selectedPayment.paid_at)
                      : selectedPayment.created_at
                      ? formatDateTime(selectedPayment.created_at)
                      : '-'}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-500 font-medium">Status Verifikasi</span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {selectedPayment.status === 'PAID'
                      ? 'Terverifikasi Berhasil & Aman'
                      : selectedPayment.status === 'PENDING'
                      ? 'Menunggu Pembayaran Tamu'
                      : 'Transaksi Selesai'}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedPayment(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

