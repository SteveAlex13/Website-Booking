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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Laporan & Rekapitulasi</h1>
          <p className="text-sm text-slate-500 mt-1">
            Analisis pendapatan dan layanan paling populer berdasarkan rentang tanggal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportExcel}
            disabled={!reportData || loading}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
            title="Unduh laporan lengkap dalam format Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor ke Excel (.xlsx)</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Cetak / Ekspor PDF</span>
          </button>
        </div>
      </div>

      {/* Date Filter Box */}
      <form
        onSubmit={handleFilterSubmit}
        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4"
      >
        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-slate-600">Dari:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-slate-600">Sampai:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          {loading ? 'Memuat...' : 'Terapkan Filter'}
        </button>
      </form>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Pendapatan Terverifikasi Periode Ini
          </span>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">
            {formatRupiah(reportData?.total_revenue || 0)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Booking Masuk Periode Ini
          </span>
          <p className="text-3xl font-extrabold text-indigo-600 mt-2">
            {reportData?.total_bookings || 0} Reservasi
          </p>
        </div>
      </div>

      {/* Financial Inflow Breakdown (Bentuk Uang Masuk) */}
      {reportData?.payment_channels && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Wallet className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Rincian Bentuk Uang Masuk (Payment Inflows)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rekapitulasi penerimaan dana hotel berdasarkan kanal pembayaran tamu: Cash, Debit & Kredit EDC, serta Midtrans.
                </p>
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              Periode: <span className="font-bold text-slate-800">{reportData.start_date}</span> s/d{' '}
              <span className="font-bold text-slate-800">{reportData.end_date}</span>
            </div>
          </div>

          {/* Visual Proportion Bar */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-2">
              <span className="flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-indigo-500" />
                <span>Proporsi Distribusi Pendapatan Masuk:</span>
              </span>
              <span className="text-emerald-700 font-black">
                Total: {formatRupiah(reportData.total_revenue || 0)}
              </span>
            </div>
            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
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
            <div className="flex flex-wrap gap-4 mt-2.5 text-[11px] text-slate-600 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Tunai ({reportData.payment_channels.cash?.percentage || 0}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                QRIS EDC ({reportData.payment_channels.qris?.percentage || 0}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                Kartu Debit ({reportData.payment_channels.debit_card?.percentage || 0}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                Kartu Kredit ({reportData.payment_channels.credit_card?.percentage || 0}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                Midtrans Online ({reportData.payment_channels.midtrans?.percentage || 0}%)
              </span>
            </div>
          </div>

          {/* 5 Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* 1. Cash Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-emerald-50/20 border border-emerald-200/80 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Banknote className="w-5 h-5 text-emerald-700" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                    Front Desk
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mt-3">Uang Tunai (Cash)</h3>
                <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                  {formatRupiah(reportData.payment_channels.cash?.total_amount || 0)}
                </p>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Pelunasan tunai fisik diterima Front Desk saat Check-In.
                </p>
              </div>
              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>{reportData.payment_channels.cash?.count || 0} Transaksi</span>
                <span className="text-emerald-700 font-bold">{reportData.payment_channels.cash?.percentage || 0}% Total</span>
              </div>
            </div>

            {/* 2. QRIS EDC Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-teal-50/80 to-teal-50/20 border border-teal-200/80 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    <QrCode className="w-5 h-5 text-teal-700" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100/70 text-teal-800 border border-teal-200">
                    Mesin EDC
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mt-3">QRIS (Mesin EDC)</h3>
                <p className="text-xl sm:text-2xl font-black text-teal-700 mt-1">
                  {formatRupiah(reportData.payment_channels.qris?.total_amount || 0)}
                </p>
                {/* Bank breakdown badges */}
                <div className="grid grid-cols-2 gap-1 mt-2.5 pt-2 border-t border-teal-200/60 text-[10px]">
                  <span className="bg-white/80 px-1.5 py-0.5 rounded border border-teal-200 font-semibold text-slate-700">
                    BCA: {formatRupiah(reportData.payment_channels.qris?.banks?.bca || 0)}
                  </span>
                  <span className="bg-white/80 px-1.5 py-0.5 rounded border border-teal-200 font-semibold text-slate-700">
                    BRI: {formatRupiah(reportData.payment_channels.qris?.banks?.bri || 0)}
                  </span>
                  <span className="bg-white/80 px-1.5 py-0.5 rounded border border-teal-200 font-semibold text-slate-700">
                    BTN: {formatRupiah(reportData.payment_channels.qris?.banks?.btn || 0)}
                  </span>
                  <span className="bg-white/80 px-1.5 py-0.5 rounded border border-teal-200 font-semibold text-slate-700">
                    Mandiri: {formatRupiah(reportData.payment_channels.qris?.banks?.mandiri || 0)}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-teal-200/60 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>{reportData.payment_channels.qris?.count || 0} Transaksi</span>
                <span className="text-teal-700 font-bold">{reportData.payment_channels.qris?.percentage || 0}% Total</span>
              </div>
            </div>

            {/* 3. Debit Card Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 to-blue-50/20 border border-blue-200/80 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5 text-blue-700" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-800 border border-blue-200">
                    Mesin EDC
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mt-3">Kartu Debit (EDC)</h3>
                <p className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
                  {formatRupiah(reportData.payment_channels.debit_card?.total_amount || 0)}
                </p>
                {/* Bank breakdown badges */}
                <div className="grid grid-cols-2 gap-1 mt-2.5 pt-2 border-t border-blue-200/60 text-[10px]">
                  <span className="bg-white/80 px-1.5 py-0.5 rounded border border-blue-200 font-semibold text-slate-700">
                    BCA: {formatRupiah(reportData.payment_channels.debit_card?.banks?.bca || 0)}
                  </span>
                  <span className="bg-white/80 px-1.5 py-0.5 rounded border border-blue-200 font-semibold text-slate-700">
                    BRI: {formatRupiah(reportData.payment_channels.debit_card?.banks?.bri || 0)}
                  </span>
                  <span className="bg-white/80 px-1.5 py-0.5 rounded border border-blue-200 font-semibold text-slate-700">
                    BTN: {formatRupiah(reportData.payment_channels.debit_card?.banks?.btn || 0)}
                  </span>
                  <span className="bg-white/80 px-1.5 py-0.5 rounded border border-blue-200 font-semibold text-slate-700">
                    Mandiri: {formatRupiah(reportData.payment_channels.debit_card?.banks?.mandiri || 0)}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>{reportData.payment_channels.debit_card?.count || 0} Transaksi</span>
                <span className="text-blue-700 font-bold">{reportData.payment_channels.debit_card?.percentage || 0}% Total</span>
              </div>
            </div>

            {/* 3. Credit Card Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-50/80 to-purple-50/20 border border-purple-200/80 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5 text-purple-700" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100/70 text-purple-800 border border-purple-200">
                    Mesin EDC
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mt-3">Kartu Kredit (EDC)</h3>
                <p className="text-xl sm:text-2xl font-black text-purple-700 mt-1">
                  {formatRupiah(reportData.payment_channels.credit_card?.total_amount || 0)}
                </p>
                {/* Bank breakdown badges */}
                <div className="grid grid-cols-2 gap-1 mt-2.5 pt-2 border-t border-purple-200/60 text-[10px]">
                  <span className="bg-white/80 px-1.5 py-0.5 rounded border border-purple-200 font-semibold text-slate-700">
                    BCA: {formatRupiah(reportData.payment_channels.credit_card?.banks?.bca || 0)}
                  </span>
                  <span className="bg-white/80 px-1.5 py-0.5 rounded border border-purple-200 font-semibold text-slate-700">
                    BRI: {formatRupiah(reportData.payment_channels.credit_card?.banks?.bri || 0)}
                  </span>
                  <span className="bg-white/80 px-1.5 py-0.5 rounded border border-purple-200 font-semibold text-slate-700">
                    BTN: {formatRupiah(reportData.payment_channels.credit_card?.banks?.btn || 0)}
                  </span>
                  <span className="bg-white/80 px-1.5 py-0.5 rounded border border-purple-200 font-semibold text-slate-700">
                    Mandiri: {formatRupiah(reportData.payment_channels.credit_card?.banks?.mandiri || 0)}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>{reportData.payment_channels.credit_card?.count || 0} Transaksi</span>
                <span className="text-purple-700 font-bold">{reportData.payment_channels.credit_card?.percentage || 0}% Total</span>
              </div>
            </div>

            {/* 4. Midtrans Gateway Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-50/80 to-sky-50/20 border border-sky-200/80 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                    <Globe className="w-5 h-5 text-sky-700" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100/70 text-sky-800 border border-sky-200">
                    Online Gateway
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mt-3">Midtrans Snap Online</h3>
                <p className="text-xl sm:text-2xl font-black text-sky-700 mt-1">
                  {formatRupiah(reportData.payment_channels.midtrans?.total_amount || 0)}
                </p>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  QRIS, GoPay, BCA/BNI/BRI VA, dan Kartu Online otomatis terverifikasi.
                </p>
              </div>
              <div className="pt-2 border-t border-sky-200/60 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>{reportData.payment_channels.midtrans?.count || 0} Transaksi</span>
                <span className="text-sky-700 font-bold">{reportData.payment_channels.midtrans?.percentage || 0}% Total</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Services Ranking */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <Award className="w-5 h-5 text-amber-500" />
          <span>Layanan Paling Banyak Dipesan</span>
        </h2>

        {reportData?.top_services?.length === 0 ? (
          <p className="text-xs text-slate-400">Belum ada data pemesanan pada periode ini.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {reportData?.top_services?.map((svc, idx) => (
              <div key={svc.id} className="py-3 flex items-center justify-between text-sm">
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">{svc.name}</span>
                    <span className="text-xs text-slate-400 ml-2">({formatRupiah(svc.price)})</span>
                  </div>
                </div>
                <div className="text-right font-extrabold text-indigo-600 text-sm">
                  {svc.bookings_count}x Dipesan
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">Rincian Reservasi Periode</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Kode</th>
                <th className="px-6 py-3 text-left">Tgl Order</th>
                <th className="px-6 py-3 text-left">Pelanggan</th>
                <th className="px-6 py-3 text-left">Tipe Kamar</th>
                <th className="px-6 py-3 text-left">Nominal</th>
                <th className="px-6 py-3 text-left">Bentuk Uang / Metode</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData?.bookings?.map((b) => {
                const statusCfg = BOOKING_STATUS_CONFIG[b.status] || BOOKING_STATUS_CONFIG.PENDING_PAYMENT;
                return (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-3.5 font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                      {b.booking_code}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {formatDateTime(b.created_at)}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                      {b.customer_name}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 whitespace-nowrap">
                      {b.room_type?.name || b.service_name || '-'}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                      {formatRupiah(b.total_amount)}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      {renderPaymentBadge(b)}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        {statusCfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

