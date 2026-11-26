import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { adminService } from '../../services/adminService';
import { formatRupiah, formatDateTime, BOOKING_STATUS_CONFIG } from '../../utils/format';
import {
  BarChart3,
  Download,
  Filter,
  Calendar,
  Award,
  Banknote,
  CreditCard,
  Globe,
  PieChart,
  Wallet,
  QrCode,
  FileSpreadsheet,
} from 'lucide-react';

export default function AdminReportsPage() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await adminService.getReports({
        start_date: startDate,
        end_date: endDate,
      });
      if (res.data) setReportData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const applyQuickPreset = (preset) => {
    const now = new Date();
    let start, end;
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
    setLoading(true);
    adminService
      .getReports({ start_date: start, end_date: end })
      .then((res) => {
        if (res.data) setReportData(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan Finansial & Bentuk Uang Masuk
    const channels = reportData.payment_channels || {};
    const summaryData = [
      ['LAPORAN FINANSIAL & REKAPITULASI PENDAPATAN HOTEL'],
      ['The Royal Nusantara Resort & Luxury Suites'],
      [],
      ['Periode Laporan:', `${reportData.start_date} s/d ${reportData.end_date}`],
      ['Tanggal Cetak:', new Date().toLocaleString('id-ID')],
      [],
      ['RINGKASAN UTAMA'],
      ['Indikator', 'Nilai'],
      ['Total Pendapatan Terverifikasi (IDR)', Number(reportData.total_revenue || 0)],
      ['Total Reservasi Masuk', Number(reportData.total_bookings || 0)],
      [],
      ['RINCIAN BENTUK UANG MASUK (PAYMENT INFLOWS)'],
      ['Bentuk Uang / Kanal Pembayaran', 'Total Nominal (IDR)', 'Jumlah Transaksi', 'Persentase (%)', 'Rincian / Keterangan'],
      [
        'Uang Tunai (Cash Front Desk)',
        Number(channels.cash?.total_amount || 0),
        Number(channels.cash?.count || 0),
        `${channels.cash?.percentage || 0}%`,
        'Pelunasan tunai fisik di Front Desk saat tamu Check-In',
      ],
      [
        'QRIS (Mesin EDC)',
        Number(channels.qris?.total_amount || 0),
        Number(channels.qris?.count || 0),
        `${channels.qris?.percentage || 0}%`,
        `BCA: Rp ${(channels.qris?.banks?.bca || 0).toLocaleString('id-ID')} | BRI: Rp ${(channels.qris?.banks?.bri || 0).toLocaleString('id-ID')} | BTN: Rp ${(channels.qris?.banks?.btn || 0).toLocaleString('id-ID')} | Mandiri: Rp ${(channels.qris?.banks?.mandiri || 0).toLocaleString('id-ID')}`,
      ],
      [
        'Kartu Debit (Mesin EDC)',
        Number(channels.debit_card?.total_amount || 0),
        Number(channels.debit_card?.count || 0),
        `${channels.debit_card?.percentage || 0}%`,
        `BCA: Rp ${(channels.debit_card?.banks?.bca || 0).toLocaleString('id-ID')} | BRI: Rp ${(channels.debit_card?.banks?.bri || 0).toLocaleString('id-ID')} | BTN: Rp ${(channels.debit_card?.banks?.btn || 0).toLocaleString('id-ID')} | Mandiri: Rp ${(channels.debit_card?.banks?.mandiri || 0).toLocaleString('id-ID')}`,
      ],
      [
        'Kartu Kredit (Mesin EDC)',
        Number(channels.credit_card?.total_amount || 0),
        Number(channels.credit_card?.count || 0),
        `${channels.credit_card?.percentage || 0}%`,
        `BCA: Rp ${(channels.credit_card?.banks?.bca || 0).toLocaleString('id-ID')} | BRI: Rp ${(channels.credit_card?.banks?.bri || 0).toLocaleString('id-ID')} | BTN: Rp ${(channels.credit_card?.banks?.btn || 0).toLocaleString('id-ID')} | Mandiri: Rp ${(channels.credit_card?.banks?.mandiri || 0).toLocaleString('id-ID')}`,
      ],
      [
        'Midtrans Online Gateway',
        Number(channels.midtrans?.total_amount || 0),
        Number(channels.midtrans?.count || 0),
        `${channels.midtrans?.percentage || 0}%`,
        'Transaksi otomatis website (QRIS Snap, Virtual Account, GoPay)',
      ],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [
      { wch: 32 },
      { wch: 24 },
      { wch: 18 },
      { wch: 16 },
      { wch: 70 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Finansial');

    // Sheet 2: Rincian Transaksi Reservasi
    const bookingsRows = [
      [
        'No',
        'Kode Booking',
        'Tanggal Order',
        'Nama Tamu',
        'Email Tamu',
        'No. Telepon',
        'Tipe Kamar',
        'Check-In',
        'Check-Out',
        'Durasi (Malam)',
        'Total Nominal (IDR)',
        'Metode Reservasi',
        'Bentuk Uang / Kanal EDC',
        'No. Referensi / RRN',
        'Status Reservasi',
      ],
    ];

    (reportData.bookings || []).forEach((b, idx) => {
      const payment = b.latest_payment || b.latestPayment;
      const pType = (payment?.payment_type || '').toLowerCase();
      const isPaid = payment?.status === 'PAID';
      let methodText = b.payment_method === 'cash' ? 'Bayar di Tempat' : 'Midtrans Online';
      let detailText = '-';

      if (b.payment_method === 'cash') {
        if (isPaid && pType) {
          if (pType === 'cash') detailText = 'Tunai (Front Desk)';
          else if (pType.startsWith('qris_')) detailText = `QRIS ${pType.replace('qris_', '').toUpperCase()} (EDC)`;
          else if (pType.startsWith('debit_')) detailText = `Debit ${pType.replace('debit_', '').toUpperCase()} (EDC)`;
          else if (pType.startsWith('credit_')) detailText = `CC ${pType.replace('credit_', '').toUpperCase()} (EDC)`;
          else detailText = pType.toUpperCase();
        } else {
          detailText = 'Menunggu Pelunasan Check-In';
        }
      } else {
        detailText = (pType || 'Midtrans Snap').toUpperCase();
      }

      bookingsRows.push([
        idx + 1,
        b.booking_code,
        formatDateTime(b.created_at),
        b.customer_name || '-',
        b.customer_email || b.user?.email || '-',
        b.customer_phone || '-',
        b.room_type?.name || b.service_name || '-',
        b.check_in_date || '-',
        b.check_out_date || '-',
        b.total_nights || 1,
        Number(b.total_amount || 0),
        methodText,
        detailText,
        payment?.transaction_id || '-',
        BOOKING_STATUS_CONFIG[b.status]?.label || b.status,
      ]);
    });

    const wsBookings = XLSX.utils.aoa_to_sheet(bookingsRows);
    wsBookings['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 20 },
      { wch: 22 },
      { wch: 25 },
      { wch: 16 },
      { wch: 26 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 18 },
      { wch: 25 },
      { wch: 22 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, wsBookings, 'Rincian Reservasi');

    const filename = `Laporan_Finansial_${reportData.start_date}_sd_${reportData.end_date}.xlsx`;
    XLSX.writeFile(wb, filename);
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
          <span>Bayar di Tempat (Pending)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
        <Globe className="w-3 h-3 text-sky-600" />
        <span>Midtrans Online</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Laporan & Rekapitulasi</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis arus pendapatan hotel dan statistik layanan berdasarkan rentang tanggal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportExcel}
            disabled={!reportData || loading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
            title="Unduh laporan lengkap dalam format Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Date Filter Toolbar (Compact with Presets) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Quick Presets */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Preset:</span>
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
        </div>

        {/* Date Form Inputs */}
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-2 self-end md:self-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-500">Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-500">Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Memuat...' : 'Filter'}
          </button>
        </form>
      </div>

      {/* KPI Cards Grid - Compact & Proportionate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Pendapatan Terverifikasi
            </span>
            <p className="text-xl font-black text-emerald-600 mt-0.5">
              {formatRupiah(reportData?.total_revenue || 0)}
            </p>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-block mt-1">
              ✓ Lunas Masuk
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Reservasi Masuk
            </span>
            <p className="text-xl font-black text-indigo-600 mt-0.5">
              {reportData?.total_bookings || 0} Reservasi
            </p>
            <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full inline-block mt-1">
              Periode Dipilih
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Rata-Rata per Reservasi
            </span>
            <p className="text-xl font-black text-amber-700 mt-0.5">
              {formatRupiah(
                Math.round((reportData?.total_revenue || 0) / Math.max(1, reportData?.total_bookings || 1))
              )}
            </p>
            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-block mt-1">
              Nilai per Tamu
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Layanan Terlaris
            </span>
            <p className="text-xs font-black text-slate-900 mt-1 truncate max-w-[130px]" title={reportData?.top_services?.[0]?.name || '-'}>
              {reportData?.top_services?.[0]?.name || 'Belum Ada'}
            </p>
            <span className="text-[10px] text-slate-500 font-semibold block mt-1">
              {reportData?.top_services?.[0]?.bookings_count || 0}x dipesan tamu
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Financial Inflow Breakdown (Bentuk Uang Masuk) - Compact & Sleek */}
      {reportData?.payment_channels && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Wallet className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  Rincian Bentuk Uang Masuk (Payment Inflows)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Rekapitulasi penerimaan dana hotel berdasarkan kanal: Cash, EDC, & Midtrans.
                </p>
              </div>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
              Periode: <span className="font-bold text-slate-800">{reportData.start_date}</span> s/d{' '}
              <span className="font-bold text-slate-800">{reportData.end_date}</span>
            </div>
          </div>

          {/* Sleek Visual Proportion Bar */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-1.5">
              <span className="flex items-center gap-1.5 text-[11px]">
                <PieChart className="w-3.5 h-3.5 text-indigo-500" />
                <span>Proporsi Arus Kas:</span>
              </span>
              <span className="text-emerald-700 font-extrabold text-xs">
                Total: {formatRupiah(reportData.total_revenue || 0)}
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${reportData.payment_channels.cash?.percentage || 0}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`Tunai: ${reportData.payment_channels.cash?.percentage || 0}%`}
              />
              <div
                style={{ width: `${reportData.payment_channels.qris?.percentage || 0}%` }}
                className="bg-teal-500 h-full transition-all duration-500"
                title={`QRIS EDC: ${reportData.payment_channels.qris?.percentage || 0}%`}
              />
              <div
                style={{ width: `${reportData.payment_channels.debit_card?.percentage || 0}%` }}
                className="bg-blue-600 h-full transition-all duration-500"
                title={`Debit EDC: ${reportData.payment_channels.debit_card?.percentage || 0}%`}
              />
              <div
                style={{ width: `${reportData.payment_channels.credit_card?.percentage || 0}%` }}
                className="bg-purple-600 h-full transition-all duration-500"
                title={`Kredit EDC: ${reportData.payment_channels.credit_card?.percentage || 0}%`}
              />
              <div
                style={{ width: `${reportData.payment_channels.midtrans?.percentage || 0}%` }}
                className="bg-sky-500 h-full transition-all duration-500"
                title={`Midtrans Online: ${reportData.payment_channels.midtrans?.percentage || 0}%`}
              />
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-600 font-semibold">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Tunai ({reportData.payment_channels.cash?.percentage || 0}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                QRIS EDC ({reportData.payment_channels.qris?.percentage || 0}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                Debit ({reportData.payment_channels.debit_card?.percentage || 0}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
                Kredit ({reportData.payment_channels.credit_card?.percentage || 0}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                Midtrans ({reportData.payment_channels.midtrans?.percentage || 0}%)
              </span>
            </div>
          </div>

          {/* 5 Cards Grid - Clean & Compact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {/* 1. Cash Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/80 to-emerald-50/20 border border-emerald-200/80 shadow-sm flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Banknote className="w-4 h-4 text-emerald-700" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                    Front Desk
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-xs mt-2">Uang Tunai (Cash)</h3>
                <p className="text-base font-black text-emerald-700 mt-0.5">
                  {formatRupiah(reportData.payment_channels.cash?.total_amount || 0)}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2">
                  Pelunasan tunai saat Check-In di meja Front Desk.
                </p>
              </div>
              <div className="pt-1.5 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                <span>{reportData.payment_channels.cash?.count || 0} Trx</span>
                <span className="text-emerald-700 font-bold">{reportData.payment_channels.cash?.percentage || 0}% Total</span>
              </div>
            </div>

            {/* 2. QRIS EDC Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-teal-50/80 to-teal-50/20 border border-teal-200/80 shadow-sm flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    <QrCode className="w-4 h-4 text-teal-700" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-teal-100/70 text-teal-800 border border-teal-200">
                    Mesin EDC
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-xs mt-2">QRIS (Mesin EDC)</h3>
                <p className="text-base font-black text-teal-700 mt-0.5">
                  {formatRupiah(reportData.payment_channels.qris?.total_amount || 0)}
                </p>
                <div className="grid grid-cols-2 gap-1 mt-1.5 pt-1.5 border-t border-teal-200/60 text-[9px]">
                  <span className="bg-white/80 px-1 py-0.5 rounded border border-teal-200 font-semibold text-slate-700 truncate">
                    BCA: {formatRupiah(reportData.payment_channels.qris?.banks?.bca || 0)}
                  </span>
                  <span className="bg-white/80 px-1 py-0.5 rounded border border-teal-200 font-semibold text-slate-700 truncate">
                    BRI: {formatRupiah(reportData.payment_channels.qris?.banks?.bri || 0)}
                  </span>
                  <span className="bg-white/80 px-1 py-0.5 rounded border border-teal-200 font-semibold text-slate-700 truncate">
                    BTN: {formatRupiah(reportData.payment_channels.qris?.banks?.btn || 0)}
                  </span>
                  <span className="bg-white/80 px-1 py-0.5 rounded border border-teal-200 font-semibold text-slate-700 truncate">
                    Mandiri: {formatRupiah(reportData.payment_channels.qris?.banks?.mandiri || 0)}
                  </span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-teal-200/60 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                <span>{reportData.payment_channels.qris?.count || 0} Trx</span>
                <span className="text-teal-700 font-bold">{reportData.payment_channels.qris?.percentage || 0}% Total</span>
              </div>
            </div>

            {/* 3. Debit Card Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50/80 to-blue-50/20 border border-blue-200/80 shadow-sm flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <CreditCard className="w-4 h-4 text-blue-700" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-100/70 text-blue-800 border border-blue-200">
                    Mesin EDC
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-xs mt-2">Kartu Debit (EDC)</h3>
                <p className="text-base font-black text-blue-700 mt-0.5">
                  {formatRupiah(reportData.payment_channels.debit_card?.total_amount || 0)}
                </p>
                <div className="grid grid-cols-2 gap-1 mt-1.5 pt-1.5 border-t border-blue-200/60 text-[9px]">
                  <span className="bg-white/80 px-1 py-0.5 rounded border border-blue-200 font-semibold text-slate-700 truncate">
                    BCA: {formatRupiah(reportData.payment_channels.debit_card?.banks?.bca || 0)}
                  </span>
                  <span className="bg-white/80 px-1 py-0.5 rounded border border-blue-200 font-semibold text-slate-700 truncate">
                    BRI: {formatRupiah(reportData.payment_channels.debit_card?.banks?.bri || 0)}
                  </span>
                  <span className="bg-white/80 px-1 py-0.5 rounded border border-blue-200 font-semibold text-slate-700 truncate">
                    BTN: {formatRupiah(reportData.payment_channels.debit_card?.banks?.btn || 0)}
                  </span>
                  <span className="bg-white/80 px-1 py-0.5 rounded border border-blue-200 font-semibold text-slate-700 truncate">
                    Mandiri: {formatRupiah(reportData.payment_channels.debit_card?.banks?.mandiri || 0)}
                  </span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-blue-200/60 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                <span>{reportData.payment_channels.debit_card?.count || 0} Trx</span>
                <span className="text-blue-700 font-bold">{reportData.payment_channels.debit_card?.percentage || 0}% Total</span>
              </div>
            </div>

            {/* 4. Credit Card Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-50/80 to-purple-50/20 border border-purple-200/80 shadow-sm flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <CreditCard className="w-4 h-4 text-purple-700" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-100/70 text-purple-800 border border-purple-200">
                    Mesin EDC
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-xs mt-2">Kartu Kredit (EDC)</h3>
                <p className="text-base font-black text-purple-700 mt-0.5">
                  {formatRupiah(reportData.payment_channels.credit_card?.total_amount || 0)}
                </p>
                <div className="grid grid-cols-2 gap-1 mt-1.5 pt-1.5 border-t border-purple-200/60 text-[9px]">
                  <span className="bg-white/80 px-1 py-0.5 rounded border border-purple-200 font-semibold text-slate-700 truncate">
                    BCA: {formatRupiah(reportData.payment_channels.credit_card?.banks?.bca || 0)}
                  </span>
                  <span className="bg-white/80 px-1 py-0.5 rounded border border-purple-200 font-semibold text-slate-700 truncate">
                    BRI: {formatRupiah(reportData.payment_channels.credit_card?.banks?.bri || 0)}
                  </span>
                  <span className="bg-white/80 px-1 py-0.5 rounded border border-purple-200 font-semibold text-slate-700 truncate">
                    BTN: {formatRupiah(reportData.payment_channels.credit_card?.banks?.btn || 0)}
                  </span>
                  <span className="bg-white/80 px-1 py-0.5 rounded border border-purple-200 font-semibold text-slate-700 truncate">
                    Mandiri: {formatRupiah(reportData.payment_channels.credit_card?.banks?.mandiri || 0)}
                  </span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-purple-200/60 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                <span>{reportData.payment_channels.credit_card?.count || 0} Trx</span>
                <span className="text-purple-700 font-bold">{reportData.payment_channels.credit_card?.percentage || 0}% Total</span>
              </div>
            </div>

            {/* 5. Midtrans Gateway Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-sky-50/80 to-sky-50/20 border border-sky-200/80 shadow-sm flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                    <Globe className="w-4 h-4 text-sky-700" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-sky-100/70 text-sky-800 border border-sky-200">
                    Online Gateway
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-xs mt-2">Midtrans Snap</h3>
                <p className="text-base font-black text-sky-700 mt-0.5">
                  {formatRupiah(reportData.payment_channels.midtrans?.total_amount || 0)}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2">
                  QRIS, GoPay, BCA/BRI VA, dan Kartu Online terverifikasi otomatis.
                </p>
              </div>
              <div className="pt-1.5 border-t border-sky-200/60 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                <span>{reportData.payment_channels.midtrans?.count || 0} Trx</span>
                <span className="text-sky-700 font-bold">{reportData.payment_channels.midtrans?.percentage || 0}% Total</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Services Ranking & Bookings Table (Compact) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Services Ranking */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Layanan Paling Banyak Dipesan</span>
          </h2>

          {reportData?.top_services?.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Belum ada pemesanan pada periode ini.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {reportData?.top_services?.map((svc, idx) => (
                <div key={svc.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900">{svc.name}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">({formatRupiah(svc.price)})</span>
                    </div>
                  </div>
                  <div className="text-right font-extrabold text-indigo-600 text-xs">
                    {svc.bookings_count}x
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detailed Bookings Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-xs">Rincian Reservasi Periode</h3>
            <span className="text-[11px] text-slate-500 font-medium">
              Total {reportData?.bookings?.length || 0} entri
            </span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5 text-left">Kode</th>
                  <th className="px-3.5 py-2.5 text-left">Pelanggan</th>
                  <th className="px-3.5 py-2.5 text-left">Kamar</th>
                  <th className="px-3.5 py-2.5 text-left">Nominal</th>
                  <th className="px-3.5 py-2.5 text-left">Metode</th>
                  <th className="px-3.5 py-2.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData?.bookings?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      Tidak ada reservasi pada rentang tanggal ini.
                    </td>
                  </tr>
                ) : (
                  reportData?.bookings?.map((b) => {
                    const statusCfg = BOOKING_STATUS_CONFIG[b.status] || BOOKING_STATUS_CONFIG.PENDING_PAYMENT;
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900 text-[11px] whitespace-nowrap">
                          {b.booking_code}
                        </td>
                        <td className="px-3.5 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                          {b.customer_name}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap max-w-[150px] truncate" title={b.room_type?.name || b.service_name || '-'}>
                          {b.room_type?.name || b.service_name || '-'}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                          {formatRupiah(b.total_amount)}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {renderPaymentBadge(b)}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            {statusCfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

