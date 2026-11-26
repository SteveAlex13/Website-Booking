import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { adminService } from '../../services/adminService';
import { formatRupiah, formatDate, formatDateTime, BOOKING_STATUS_CONFIG } from '../../utils/format';
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
  Printer,
  Hotel,
  ShieldCheck,
  CheckCircle2,
  Building2,
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

    const IDR_FORMAT = '"Rp "#,##0';
    const NUM_FORMAT = '#,##0';
    const PCT_FORMAT = '0.0%';

    // ==========================================
    // SHEET 1: RINGKASAN EKSEKUTIF & ARUS KAS
    // ==========================================
    const channels = reportData.payment_channels || {};
    const cash = channels.cash || { total_amount: 0, count: 0, percentage: 0 };
    const qris = channels.qris || { total_amount: 0, count: 0, percentage: 0, banks: {} };
    const debit = channels.debit_card || { total_amount: 0, count: 0, percentage: 0, banks: {} };
    const credit = channels.credit_card || { total_amount: 0, count: 0, percentage: 0, banks: {} };
    const midtrans = channels.midtrans || { total_amount: 0, count: 0, percentage: 0 };

    const frontDeskTrx = (cash.count || 0) + (qris.count || 0) + (debit.count || 0) + (credit.count || 0);
    const avgRevenue =
      reportData.total_bookings > 0
        ? Math.round(Number(reportData.total_revenue || 0) / Number(reportData.total_bookings || 1))
        : 0;

    const summaryAoa = [
      ['HOTEL THE ROYAL NUSANTARA RESORT & SPA'],
      ['LAPORAN KEUANGAN & REKAPITULASI ARUS KAS MASUK'],
      ['Front Desk Property Management System (PMS) Financial Ledger'],
      [],
      ['Periode Laporan:', `${reportData.start_date} s/d ${reportData.end_date}`, '', 'Status Dokumen:', 'Terverifikasi (Sistem Kasir & Online)'],
      ['Tanggal Cetak:', new Date().toLocaleString('id-ID'), '', 'Mata Uang:', 'IDR (Indonesian Rupiah)'],
      ['Entitas Pelapor:', 'Divisi Finance & Front Desk', '', 'Total Entri Booking:', `${Number(reportData.total_bookings || 0)} Reservasi`],
      [],
      ['1. INDIKATOR KINERJA FINANSIAL (EXECUTIVE KPI OVERVIEW)'],
      ['Indikator Finansial', 'Nilai Capaian', 'Satuan / Keterangan Operasional'],
      ['Total Pendapatan Terverifikasi', Number(reportData.total_revenue || 0), 'Akumulasi seluruh transaksi settlement/lunas'],
      ['Total Reservasi Masuk', Number(reportData.total_bookings || 0), 'Total booking tamu terdata pada periode ini'],
      ['Rata-rata Pendapatan per Reservasi (ADR)', avgRevenue, 'Rata-rata nilai transaksi bruto per reservasi tamu'],
      ['Total Transaksi Front Desk (Tunai & EDC)', frontDeskTrx, 'Total transaksi pelunasan fisik kasir saat tamu check-in'],
      ['Total Transaksi Online (Midtrans Gateway)', Number(midtrans.count || 0), 'Total transaksi pelunasan otomatis melalui website'],
      [],
      ['2. REKAPITULASI BENTUK UANG MASUK (PAYMENT INFLOWS BREAKDOWN)'],
      ['Kanal Pembayaran', 'Metode / Instansi', 'Jumlah Trx', 'Kontribusi', 'Total Nominal (IDR)', 'Rincian Operasional & Catatan Rekonsiliasi'],
      [
        'Uang Tunai (Cash)',
        'Front Desk Kasir Fisik',
        Number(cash.count || 0),
        Number(cash.percentage || 0) / 100,
        Number(cash.total_amount || 0),
        'Pelunasan tunai fisik langsung di kasir saat tamu Check-In'
      ],
      [
        'QRIS (Mesin EDC)',
        'EDC Bank Mitra',
        Number(qris.count || 0),
        Number(qris.percentage || 0) / 100,
        Number(qris.total_amount || 0),
        `BCA: Rp ${(qris.banks?.bca || 0).toLocaleString('id-ID')} | BRI: Rp ${(qris.banks?.bri || 0).toLocaleString('id-ID')} | BTN: Rp ${(qris.banks?.btn || 0).toLocaleString('id-ID')} | Mandiri: Rp ${(qris.banks?.mandiri || 0).toLocaleString('id-ID')}`
      ],
      [
        'Kartu Debit (EDC)',
        'EDC Bank Mitra',
        Number(debit.count || 0),
        Number(debit.percentage || 0) / 100,
        Number(debit.total_amount || 0),
        `BCA: Rp ${(debit.banks?.bca || 0).toLocaleString('id-ID')} | BRI: Rp ${(debit.banks?.bri || 0).toLocaleString('id-ID')} | BTN: Rp ${(debit.banks?.btn || 0).toLocaleString('id-ID')} | Mandiri: Rp ${(debit.banks?.mandiri || 0).toLocaleString('id-ID')}`
      ],
      [
        'Kartu Kredit (EDC)',
        'EDC Bank Mitra',
        Number(credit.count || 0),
        Number(credit.percentage || 0) / 100,
        Number(credit.total_amount || 0),
        `BCA: Rp ${(credit.banks?.bca || 0).toLocaleString('id-ID')} | BRI: Rp ${(credit.banks?.bri || 0).toLocaleString('id-ID')} | BTN: Rp ${(credit.banks?.btn || 0).toLocaleString('id-ID')} | Mandiri: Rp ${(credit.banks?.mandiri || 0).toLocaleString('id-ID')}`
      ],
      [
        'Midtrans Online Gateway',
        'Payment Gateway Otomatis',
        Number(midtrans.count || 0),
        Number(midtrans.percentage || 0) / 100,
        Number(midtrans.total_amount || 0),
        'Transaksi terverifikasi otomatis website (QRIS Snap, GoPay, VA Bank, Kartu Online)'
      ],
      [
        'TOTAL ARUS KAS MASUK',
        'Seluruh Kanal Pembayaran',
        { f: 'SUM(C19:C23)' },
        { f: 'SUM(D19:D23)' },
        { f: 'SUM(E19:E23)' },
        'Akumulasi 100% arus dana terverifikasi pada periode terpilih'
      ],
      [],
      ['3. RINCIAN PENERIMAAN MESIN EDC PER BANK MITRA'],
      ['Nama Bank Mitra EDC', 'QRIS EDC (IDR)', 'Kartu Debit (IDR)', 'Kartu Kredit (IDR)', 'Total Penerimaan EDC (IDR)'],
      [
        'Bank Central Asia (BCA)',
        Number(qris.banks?.bca || 0),
        Number(debit.banks?.bca || 0),
        Number(credit.banks?.bca || 0),
        { f: 'SUM(B28:D28)' }
      ],
      [
        'Bank Rakyat Indonesia (BRI)',
        Number(qris.banks?.bri || 0),
        Number(debit.banks?.bri || 0),
        Number(credit.banks?.bri || 0),
        { f: 'SUM(B29:D29)' }
      ],
      [
        'Bank Tabungan Negara (BTN)',
        Number(qris.banks?.btn || 0),
        Number(debit.banks?.btn || 0),
        Number(credit.banks?.btn || 0),
        { f: 'SUM(B30:D30)' }
      ],
      [
        'Bank Mandiri',
        Number(qris.banks?.mandiri || 0),
        Number(debit.banks?.mandiri || 0),
        Number(credit.banks?.mandiri || 0),
        { f: 'SUM(B31:D31)' }
      ],
      [
        'TOTAL PENERIMAAN EDC',
        { f: 'SUM(B28:B31)' },
        { f: 'SUM(C28:C31)' },
        { f: 'SUM(D28:D31)' },
        { f: 'SUM(E28:E31)' }
      ],
      [],
      ['* Dokumen ini digenerate secara otomatis oleh sistem PMS The Royal Nusantara Resort & Spa. Seluruh data diverifikasi sesuai mutasi pembukuan kasir & gateway.']
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);

    // Formatting KPI numbers
    if (wsSummary['B11']) { wsSummary['B11'].z = IDR_FORMAT; wsSummary['B11'].t = 'n'; }
    if (wsSummary['B12']) { wsSummary['B12'].z = NUM_FORMAT; wsSummary['B12'].t = 'n'; }
    if (wsSummary['B13']) { wsSummary['B13'].z = IDR_FORMAT; wsSummary['B13'].t = 'n'; }
    if (wsSummary['B14']) { wsSummary['B14'].z = NUM_FORMAT; wsSummary['B14'].t = 'n'; }
    if (wsSummary['B15']) { wsSummary['B15'].z = NUM_FORMAT; wsSummary['B15'].t = 'n'; }

    // Formatting Inflows Table
    for (let r = 19; r <= 24; r++) {
      const cCell = wsSummary['C' + r];
      const dCell = wsSummary['D' + r];
      const eCell = wsSummary['E' + r];
      if (cCell) { cCell.z = NUM_FORMAT; cCell.t = 'n'; }
      if (dCell) { dCell.z = PCT_FORMAT; dCell.t = 'n'; }
      if (eCell) { eCell.z = IDR_FORMAT; eCell.t = 'n'; }
    }

    // Formatting EDC Table
    for (let r = 28; r <= 32; r++) {
      ['B', 'C', 'D', 'E'].forEach((col) => {
        const cell = wsSummary[col + r];
        if (cell) { cell.z = IDR_FORMAT; cell.t = 'n'; }
      });
    }

    wsSummary['!cols'] = [
      { wch: 34 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 25 },
      { wch: 72 }
    ];

    wsSummary['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
      { s: { r: 8, c: 0 }, e: { r: 8, c: 2 } },
      { s: { r: 16, c: 0 }, e: { r: 16, c: 5 } },
      { s: { r: 25, c: 0 }, e: { r: 25, c: 4 } },
      { s: { r: 33, c: 0 }, e: { r: 33, c: 5 } }
    ];

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Finansial');

    // ==========================================
    // SHEET 2: BUKU BESAR RESERVASI
    // ==========================================
    const bookingsAoa = [
      ['HOTEL THE ROYAL NUSANTARA RESORT & SPA'],
      ['BUKU BESAR RINCIAN TRANSAKSI RESERVASI HOTEL'],
      [`Periode: ${reportData.start_date} s/d ${reportData.end_date} | Entitas: Front Desk & Online Gateway`],
      [],
      [
        'No',
        'Kode Booking',
        'Tanggal Order',
        'Nama Tamu',
        'Email Tamu',
        'No. Telepon / WA',
        'Tipe Kamar / Layanan',
        'No. Kamar Fisik',
        'Tanggal Check-In',
        'Tanggal Check-Out',
        'Durasi (Malam)',
        'Total Biaya (IDR)',
        'Metode Reservasi',
        'Bentuk Pelunasan / EDC',
        'No. Referensi / RRN',
        'Status Reservasi'
      ]
    ];

    const bookingsList = reportData.bookings || [];
    bookingsList.forEach((b, idx) => {
      const payment = b.latest_payment || b.latestPayment;
      const pType = (payment?.payment_type || '').toLowerCase();
      const isPaid = payment?.status === 'PAID';
      let methodText = b.payment_method === 'cash' ? 'Bayar di Tempat (Kasir)' : 'Midtrans Online';
      let detailText = '-';

      if (b.payment_method === 'cash') {
        if (isPaid && pType) {
          if (pType === 'cash') detailText = 'Tunai (Front Desk)';
          else if (pType.startsWith('qris_')) detailText = `QRIS ${pType.replace('qris_', '').toUpperCase()} (EDC)`;
          else if (pType.startsWith('debit_')) detailText = `Debit ${pType.replace('debit_', '').toUpperCase()} (EDC)`;
          else if (pType.startsWith('credit_')) detailText = `CC ${pType.replace('credit_', '').toUpperCase()} (EDC)`;
          else detailText = `${pType.toUpperCase()} (EDC)`;
        } else {
          detailText = 'Menunggu Pelunasan Check-In';
        }
      } else {
        detailText = (pType || 'Midtrans Snap').toUpperCase();
      }

      const assignedRoomNumber = b.assigned_room?.room_number || b.assignedRoom?.room_number || 'Belum Di-assign';
      const statusLabel =
        BOOKING_STATUS_CONFIG[b.status]?.label ||
        (b.status === 'CONFIRMED'
          ? 'Terkonfirmasi'
          : b.status === 'CHECKED_IN'
          ? 'Sedang Menginap'
          : b.status === 'CHECKED_OUT'
          ? 'Selesai (Check-Out)'
          : b.status === 'CANCELLED'
          ? 'Dibatalkan'
          : b.status === 'EXPIRED'
          ? 'Hangus / Expired'
          : b.status);

      bookingsAoa.push([
        idx + 1,
        b.booking_code,
        formatDateTime(b.created_at),
        b.customer_name || '-',
        b.customer_email || b.user?.email || '-',
        b.customer_phone || b.user?.phone || '-',
        b.room_type?.name || b.service_name || '-',
        assignedRoomNumber,
        b.check_in_date || '-',
        b.check_out_date || '-',
        Number(b.total_nights || 1),
        Number(b.total_amount || 0),
        methodText,
        detailText,
        payment?.transaction_id || payment?.order_id || '-',
        statusLabel
      ]);
    });

    const headerRowIdx = 5;
    const lastDataRowIdx = headerRowIdx + bookingsList.length;

    if (bookingsList.length > 0) {
      bookingsAoa.push([
        'TOTAL AKUMULASI PERIODE',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        { f: `SUM(K6:K${lastDataRowIdx})` },
        { f: `SUM(L6:L${lastDataRowIdx})` },
        '',
        '',
        '',
        ''
      ]);
    }

    const wsBookings = XLSX.utils.aoa_to_sheet(bookingsAoa);

    // Formatting data cells
    for (let r = 6; r <= lastDataRowIdx; r++) {
      const noCell = wsBookings['A' + r];
      const nightsCell = wsBookings['K' + r];
      const amountCell = wsBookings['L' + r];
      if (noCell) { noCell.z = NUM_FORMAT; noCell.t = 'n'; }
      if (nightsCell) { nightsCell.z = NUM_FORMAT; nightsCell.t = 'n'; }
      if (amountCell) { amountCell.z = IDR_FORMAT; amountCell.t = 'n'; }
    }

    // Formatting total row
    if (bookingsList.length > 0) {
      const totalRow = lastDataRowIdx + 1;
      const nightsTot = wsBookings['K' + totalRow];
      const amountTot = wsBookings['L' + totalRow];
      if (nightsTot) { nightsTot.z = NUM_FORMAT; nightsTot.t = 'n'; }
      if (amountTot) { amountTot.z = IDR_FORMAT; amountTot.t = 'n'; }
    }

    wsBookings['!cols'] = [
      { wch: 6 },  // A: No
      { wch: 18 }, // B: Kode Booking
      { wch: 22 }, // C: Tanggal Order
      { wch: 24 }, // D: Nama Tamu
      { wch: 28 }, // E: Email
      { wch: 18 }, // F: No Telepon
      { wch: 28 }, // G: Tipe Kamar
      { wch: 18 }, // H: No Kamar Fisik
      { wch: 15 }, // I: Check-In
      { wch: 15 }, // J: Check-Out
      { wch: 15 }, // K: Durasi
      { wch: 22 }, // L: Total Biaya
      { wch: 24 }, // M: Metode Reservasi
      { wch: 26 }, // N: Bentuk Pelunasan
      { wch: 26 }, // O: No Referensi
      { wch: 22 }  // P: Status
    ];

    wsBookings['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 15 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 15 } }
    ];

    if (bookingsList.length > 0) {
      wsBookings['!merges'].push({
        s: { r: lastDataRowIdx, c: 0 },
        e: { r: lastDataRowIdx, c: 9 }
      });
      wsBookings['!autofilter'] = { ref: `A5:P${lastDataRowIdx}` };
    }

    XLSX.utils.book_append_sheet(wb, wsBookings, 'Buku Besar Reservasi');

    // ==========================================
    // SHEET 3: STATISTIK KAMAR & LAYANAN
    // ==========================================
    const topServices = reportData.top_services || reportData.top_room_types || [];
    const totalServiceBookings = topServices.reduce(
      (acc, curr) => acc + (Number(curr.bookings_count) || 0),
      0
    );

    const servicesAoa = [
      ['HOTEL THE ROYAL NUSANTARA RESORT & SPA'],
      ['STATISTIK POPULARITAS TIPE KAMAR & LAYANAN TAMBAHAN'],
      [`Periode: ${reportData.start_date} s/d ${reportData.end_date}`],
      [],
      [
        'Peringkat',
        'Nama Tipe Kamar / Layanan',
        'Tarif Satuan (IDR)',
        'Frekuensi Pemesanan',
        'Estimasi Kontribusi Omset (IDR)',
        'Pangsa Pemesanan (%)'
      ]
    ];

    topServices.forEach((svc, idx) => {
      const count = Number(svc.bookings_count || 0);
      const price = Number(svc.price || 0);
      const estRevenue = count * price;
      const share = totalServiceBookings > 0 ? count / totalServiceBookings : 0;

      servicesAoa.push([
        idx + 1,
        svc.name || '-',
        price,
        count,
        estRevenue,
        share
      ]);
    });

    const svcLastDataRow = 5 + topServices.length;
    if (topServices.length > 0) {
      servicesAoa.push([
        'TOTAL AKUMULASI LAYANAN',
        '',
        '',
        { f: `SUM(D6:D${svcLastDataRow})` },
        { f: `SUM(E6:E${svcLastDataRow})` },
        { f: `SUM(F6:F${svcLastDataRow})` }
      ]);
    }

    const wsServices = XLSX.utils.aoa_to_sheet(servicesAoa);

    // Formatting cells
    for (let r = 6; r <= svcLastDataRow; r++) {
      const rankCell = wsServices['A' + r];
      const priceCell = wsServices['C' + r];
      const countCell = wsServices['D' + r];
      const estCell = wsServices['E' + r];
      const shareCell = wsServices['F' + r];

      if (rankCell) { rankCell.z = NUM_FORMAT; rankCell.t = 'n'; }
      if (priceCell) { priceCell.z = IDR_FORMAT; priceCell.t = 'n'; }
      if (countCell) { countCell.z = NUM_FORMAT; countCell.t = 'n'; }
      if (estCell) { estCell.z = IDR_FORMAT; estCell.t = 'n'; }
      if (shareCell) { shareCell.z = PCT_FORMAT; shareCell.t = 'n'; }
    }

    if (topServices.length > 0) {
      const totalRow = svcLastDataRow + 1;
      const countTot = wsServices['D' + totalRow];
      const estTot = wsServices['E' + totalRow];
      const shareTot = wsServices['F' + totalRow];

      if (countTot) { countTot.z = NUM_FORMAT; countTot.t = 'n'; }
      if (estTot) { estTot.z = IDR_FORMAT; estTot.t = 'n'; }
      if (shareTot) { shareTot.z = PCT_FORMAT; shareTot.t = 'n'; }

      wsServices['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
        { s: { r: svcLastDataRow, c: 0 }, e: { r: svcLastDataRow, c: 2 } }
      ];
      wsServices['!autofilter'] = { ref: `A5:F${svcLastDataRow}` };
    } else {
      wsServices['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }
      ];
    }

    wsServices['!cols'] = [
      { wch: 12 },
      { wch: 35 },
      { wch: 22 },
      { wch: 22 },
      { wch: 30 },
      { wch: 22 }
    ];

    XLSX.utils.book_append_sheet(wb, wsServices, 'Performa Layanan & Kamar');

    const filename = `Laporan_Keuangan_Hotel_${reportData.start_date}_sd_${reportData.end_date}.xlsx`;
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

  const channels = reportData?.payment_channels || {};
  const cash = channels.cash || { total_amount: 0, count: 0, percentage: 0 };
  const qris = channels.qris || { total_amount: 0, count: 0, percentage: 0, banks: {} };
  const debit = channels.debit_card || { total_amount: 0, count: 0, percentage: 0, banks: {} };
  const credit = channels.credit_card || { total_amount: 0, count: 0, percentage: 0, banks: {} };
  const midtrans = channels.midtrans || { total_amount: 0, count: 0, percentage: 0 };

  const frontDeskTrx = (cash.count || 0) + (qris.count || 0) + (debit.count || 0) + (credit.count || 0);
  const avgRevenue =
    reportData?.total_bookings > 0
      ? Math.round(Number(reportData.total_revenue || 0) / Number(reportData.total_bookings || 1))
      : 0;

  const topServices = reportData?.top_services || reportData?.top_room_types || [];
  const bookingsList = reportData?.bookings || [];
  const totalPrintNights = bookingsList.reduce((acc, b) => acc + (Number(b.total_nights) || 1), 0);
  const totalPrintAmount = bookingsList.reduce((acc, b) => acc + (Number(b.total_amount) || 0), 0);

  return (
    <>
      {/* ======================================================== */}
      {/* 1. SCREEN VIEW (Hidden During Print)                      */}
      {/* ======================================================== */}
      <div className="space-y-4 print:hidden">
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
              disabled={!reportData || loading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
              title="Cetak atau simpan laporan resmi dalam format PDF (A4)"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Ekspor / Cetak PDF</span>
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

      {/* ======================================================== */}
      {/* 2. PRINT / PDF EXPORT CONTAINER (Visible Only on Print)   */}
      {/* ======================================================== */}
      {reportData && (
        <div id="printable-report" className="hidden print:block text-slate-900 bg-white">
          {/* A. Formal Hotel Letterhead (Kop Surat Resmi) */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4 print-avoid-break">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black shadow-sm print:bg-amber-600">
                  <Hotel className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                    Hotel The Royal Nusantara Resort & Spa
                  </h1>
                  <p className="text-[10px] font-bold text-amber-700 tracking-wider uppercase">
                    Luxury Suites, Beachfront Villa & International Convention
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">
                    Kawasan Pariwisata Terpadu Lot 88, Nusa Dua, Bali 80363 — Indonesia
                  </p>
                  <p className="text-[9px] text-slate-500 leading-tight">
                    Telp: +62 361 889 9900 &bull; E-mail: finance@royalnusantara.com &bull; Website: www.royalnusantara.com
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider">
                  Dokumen Audit Resmi PMS
                </span>
                <p className="text-[9px] font-mono text-slate-600 mt-1 font-bold">
                  Ref: DOC/FIN/{new Date().getFullYear()}/{(reportData.start_date || '').replace(/-/g, '')}-{(reportData.end_date || '').replace(/-/g, '')}
                </p>
                <p className="text-[9px] text-emerald-700 font-bold mt-0.5 flex items-center justify-end gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Terverifikasi Sistem Keuangan</span>
                </p>
              </div>
            </div>
            <div className="border-b border-slate-300 mt-2.5"></div>
          </div>

          {/* B. Document Title & 4-Box Metadata Grid */}
          <div className="mb-4 print-avoid-break">
            <div className="text-center mb-3">
              <h2 className="text-sm font-black text-slate-900 tracking-wide uppercase">
                Laporan Rekapitulasi Finansial & Arus Kas Masuk
              </h2>
              <p className="text-[10px] text-slate-500 font-medium">
                Front Desk Property Management System (PMS) &mdash; Executive Financial Ledger Report
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 text-[10px] border border-slate-200 rounded-lg p-2.5 bg-slate-50/70">
              <div>
                <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-wider">Periode Pembukuan:</span>
                <span className="font-extrabold text-slate-900 text-[10px]">
                  {formatDate(reportData.start_date)} s/d {formatDate(reportData.end_date)}
                </span>
              </div>
              <div>
                <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-wider">Tanggal & Waktu Cetak:</span>
                <span className="font-bold text-slate-800 text-[10px]">
                  {formatDateTime(new Date().toISOString())}
                </span>
              </div>
              <div>
                <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-wider">Total Reservasi Terdata:</span>
                <span className="font-extrabold text-slate-900 text-[10px]">
                  {reportData.total_bookings || 0} Reservasi Tamu
                </span>
              </div>
              <div>
                <span className="text-[8px] uppercase font-bold text-slate-400 block tracking-wider">Mata Uang Pembukuan:</span>
                <span className="font-extrabold text-slate-900 text-[10px]">
                  IDR (Indonesian Rupiah - Rp)
                </span>
              </div>
            </div>
          </div>

          {/* C. Bagian 1: Indikator Kinerja Finansial Utama (KPI Overview) */}
          <div className="mb-4 print-avoid-break">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <span>1. Indikator Kinerja Finansial Utama (Executive KPI Overview)</span>
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="border border-emerald-200 rounded-lg p-2 bg-emerald-50/50">
                <span className="text-[8px] font-bold text-slate-500 uppercase block">Total Pendapatan Terverifikasi</span>
                <span className="text-xs font-black text-emerald-800 block mt-0.5">
                  {formatRupiah(reportData.total_revenue || 0)}
                </span>
                <span className="text-[8px] text-slate-500 font-medium">Lunas & settlement seluruh kanal</span>
              </div>
              <div className="border border-indigo-200 rounded-lg p-2 bg-indigo-50/50">
                <span className="text-[8px] font-bold text-slate-500 uppercase block">Total Reservasi Masuk</span>
                <span className="text-xs font-black text-indigo-800 block mt-0.5">
                  {reportData.total_bookings || 0} Reservasi
                </span>
                <span className="text-[8px] text-slate-500 font-medium">Volume reservasi pada rentang tanggal</span>
              </div>
              <div className="border border-blue-200 rounded-lg p-2 bg-blue-50/50">
                <span className="text-[8px] font-bold text-slate-500 uppercase block">Rerata Nilai Booking (ADR)</span>
                <span className="text-xs font-black text-blue-800 block mt-0.5">
                  {formatRupiah(avgRevenue)}
                </span>
                <span className="text-[8px] text-slate-500 font-medium">Rata-rata omset per nomor booking</span>
              </div>
              <div className="border border-amber-200 rounded-lg p-2 bg-amber-50/50">
                <span className="text-[8px] font-bold text-slate-500 uppercase block">Rasio Kasir vs Online</span>
                <span className="text-xs font-black text-amber-800 block mt-0.5">
                  {frontDeskTrx} Kasir : {channels.midtrans?.count || 0} Gateway
                </span>
                <span className="text-[8px] text-slate-500 font-medium">Front Desk vs Midtrans Snap</span>
              </div>
            </div>
          </div>

          {/* D. Bagian 2: Rekapitulasi Bentuk Uang Masuk (Payment Inflows Breakdown) */}
          <div className="mb-4 print-avoid-break">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1">
              <span>2. Rekapitulasi Bentuk Uang Masuk (Payment Inflows Breakdown)</span>
              <span className="text-[8px] font-bold text-slate-400 normal-case">Terverifikasi Settlement</span>
            </h3>
            <table className="w-full border-collapse border border-slate-200 text-[9px]">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[8px]">
                  <th className="border border-slate-300 p-1.5 text-center w-8">No</th>
                  <th className="border border-slate-300 p-1.5 text-left">Bentuk Uang / Kanal Pembayaran</th>
                  <th className="border border-slate-300 p-1.5 text-left">Metode / Instansi Penerima</th>
                  <th className="border border-slate-300 p-1.5 text-center w-16">Jumlah Trx</th>
                  <th className="border border-slate-300 p-1.5 text-center w-16">Pangsa (%)</th>
                  <th className="border border-slate-300 p-1.5 text-right w-32">Total Nominal (IDR)</th>
                  <th className="border border-slate-300 p-1.5 text-left">Keterangan Operasional & Mutasi Kasir</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 p-1.5 text-center font-bold">1</td>
                  <td className="border border-slate-200 p-1.5 font-bold text-slate-900">Uang Tunai (Cash)</td>
                  <td className="border border-slate-200 p-1.5">Front Desk Kasir Fisik</td>
                  <td className="border border-slate-200 p-1.5 text-center font-semibold">{cash.count || 0}</td>
                  <td className="border border-slate-200 p-1.5 text-center font-semibold">{cash.percentage || 0}%</td>
                  <td className="border border-slate-200 p-1.5 text-right font-black text-slate-900">{formatRupiah(cash.total_amount)}</td>
                  <td className="border border-slate-200 p-1.5 text-[8.5px] text-slate-600">Pelunasan tunai fisik langsung di meja kasir saat check-in</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="border border-slate-200 p-1.5 text-center font-bold">2</td>
                  <td className="border border-slate-200 p-1.5 font-bold text-slate-900">QRIS (Mesin EDC)</td>
                  <td className="border border-slate-200 p-1.5">EDC Bank Partner (Multi Bank)</td>
                  <td className="border border-slate-200 p-1.5 text-center font-semibold">{qris.count || 0}</td>
                  <td className="border border-slate-200 p-1.5 text-center font-semibold">{qris.percentage || 0}%</td>
                  <td className="border border-slate-200 p-1.5 text-right font-black text-slate-900">{formatRupiah(qris.total_amount)}</td>
                  <td className="border border-slate-200 p-1.5 text-[8.5px] text-slate-600">BCA: {formatRupiah(qris.banks?.bca || 0)} | BRI: {formatRupiah(qris.banks?.bri || 0)} | BTN: {formatRupiah(qris.banks?.btn || 0)} | Mandiri: {formatRupiah(qris.banks?.mandiri || 0)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 p-1.5 text-center font-bold">3</td>
                  <td className="border border-slate-200 p-1.5 font-bold text-slate-900">Kartu Debit (EDC)</td>
                  <td className="border border-slate-200 p-1.5">EDC Bank Partner (GPN / Visa / Master)</td>
                  <td className="border border-slate-200 p-1.5 text-center font-semibold">{debit.count || 0}</td>
                  <td className="border border-slate-200 p-1.5 text-center font-semibold">{debit.percentage || 0}%</td>
                  <td className="border border-slate-200 p-1.5 text-right font-black text-slate-900">{formatRupiah(debit.total_amount)}</td>
                  <td className="border border-slate-200 p-1.5 text-[8.5px] text-slate-600">BCA: {formatRupiah(debit.banks?.bca || 0)} | BRI: {formatRupiah(debit.banks?.bri || 0)} | BTN: {formatRupiah(debit.banks?.btn || 0)} | Mandiri: {formatRupiah(debit.banks?.mandiri || 0)}</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="border border-slate-200 p-1.5 text-center font-bold">4</td>
                  <td className="border border-slate-200 p-1.5 font-bold text-slate-900">Kartu Kredit (EDC)</td>
                  <td className="border border-slate-200 p-1.5">EDC Bank Partner (Visa / MasterCard / JCB)</td>
                  <td className="border border-slate-200 p-1.5 text-center font-semibold">{credit.count || 0}</td>
                  <td className="border border-slate-200 p-1.5 text-center font-semibold">{credit.percentage || 0}%</td>
                  <td className="border border-slate-200 p-1.5 text-right font-black text-slate-900">{formatRupiah(credit.total_amount)}</td>
                  <td className="border border-slate-200 p-1.5 text-[8.5px] text-slate-600">BCA: {formatRupiah(credit.banks?.bca || 0)} | BRI: {formatRupiah(credit.banks?.bri || 0)} | BTN: {formatRupiah(credit.banks?.btn || 0)} | Mandiri: {formatRupiah(credit.banks?.mandiri || 0)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 p-1.5 text-center font-bold">5</td>
                  <td className="border border-slate-200 p-1.5 font-bold text-slate-900">Midtrans Online Gateway</td>
                  <td className="border border-slate-200 p-1.5">Payment Gateway Otomatis</td>
                  <td className="border border-slate-200 p-1.5 text-center font-semibold">{midtrans.count || 0}</td>
                  <td className="border border-slate-200 p-1.5 text-center font-semibold">{midtrans.percentage || 0}%</td>
                  <td className="border border-slate-200 p-1.5 text-right font-black text-slate-900">{formatRupiah(midtrans.total_amount)}</td>
                  <td className="border border-slate-200 p-1.5 text-[8.5px] text-slate-600">Transaksi terverifikasi otomatis website (QRIS Snap, GoPay, VA Bank, Kartu Online)</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                  <td colSpan={3} className="border border-slate-300 p-1.5 text-right uppercase tracking-wider text-[8.5px]">
                    TOTAL ARUS KAS MASUK TERVERIFIKASI
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-black">
                    {frontDeskTrx + (midtrans.count || 0)}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-black">100.0%</td>
                  <td className="border border-slate-300 p-1.5 text-right font-black text-emerald-800 text-[9.5px]">
                    {formatRupiah(reportData.total_revenue || 0)}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-[8px] text-slate-600 font-semibold">
                    Akumulasi 100% penerimaan kasir & online terverifikasi lunas
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* E. Bagian 3: Rincian Distribusi Mesin EDC per Bank Mitra */}
          <div className="mb-4 print-avoid-break">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1">
              <span>3. Rincian Distribusi Penerimaan Mesin EDC per Bank Mitra</span>
              <span className="text-[8px] font-bold text-slate-400 normal-case">Settlement Front Desk EDC</span>
            </h3>
            <table className="w-full border-collapse border border-slate-200 text-[9px]">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[8px]">
                  <th className="border border-slate-300 p-1.5 text-left">Nama Bank Mitra EDC</th>
                  <th className="border border-slate-300 p-1.5 text-right">QRIS EDC (IDR)</th>
                  <th className="border border-slate-300 p-1.5 text-right">Kartu Debit (IDR)</th>
                  <th className="border border-slate-300 p-1.5 text-right">Kartu Kredit (IDR)</th>
                  <th className="border border-slate-300 p-1.5 text-right font-black bg-slate-200/60">Subtotal EDC per Bank (IDR)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'bca', name: 'Bank Central Asia (BCA)' },
                  { key: 'bri', name: 'Bank Rakyat Indonesia (BRI)' },
                  { key: 'btn', name: 'Bank Tabungan Negara (BTN)' },
                  { key: 'mandiri', name: 'Bank Mandiri' },
                ].map((bank, idx) => {
                  const bQris = Number(qris.banks?.[bank.key] || 0);
                  const bDebit = Number(debit.banks?.[bank.key] || 0);
                  const bCredit = Number(credit.banks?.[bank.key] || 0);
                  const bSubtotal = bQris + bDebit + bCredit;
                  return (
                    <tr key={bank.key} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                      <td className="border border-slate-200 p-1.5 font-bold text-slate-900">{bank.name}</td>
                      <td className="border border-slate-200 p-1.5 text-right">{formatRupiah(bQris)}</td>
                      <td className="border border-slate-200 p-1.5 text-right">{formatRupiah(bDebit)}</td>
                      <td className="border border-slate-200 p-1.5 text-right">{formatRupiah(bCredit)}</td>
                      <td className="border border-slate-200 p-1.5 text-right font-black text-slate-900 bg-slate-100/50">
                        {formatRupiah(bSubtotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                  <td className="border border-slate-300 p-1.5 uppercase tracking-wider text-[8.5px]">TOTAL PENERIMAAN EDC</td>
                  <td className="border border-slate-300 p-1.5 text-right font-black">{formatRupiah(qris.total_amount || 0)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-black">{formatRupiah(debit.total_amount || 0)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-black">{formatRupiah(credit.total_amount || 0)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-black text-indigo-900 bg-slate-200/80">
                    {formatRupiah((qris.total_amount || 0) + (debit.total_amount || 0) + (credit.total_amount || 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* F. Bagian 4: Statistik Popularitas Tipe Kamar & Layanan */}
          {topServices.length > 0 && (
            <div className="mb-4 print-avoid-break">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1">
                <span>4. Statistik Popularitas Tipe Kamar & Layanan Tambahan</span>
                <span className="text-[8px] font-bold text-slate-400 normal-case">Top Booked Rooms</span>
              </h3>
              <table className="w-full border-collapse border border-slate-200 text-[9px]">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[8px]">
                    <th className="border border-slate-300 p-1.5 text-center w-12">Peringkat</th>
                    <th className="border border-slate-300 p-1.5 text-left">Nama Tipe Kamar / Layanan</th>
                    <th className="border border-slate-300 p-1.5 text-right w-28">Tarif Satuan (IDR)</th>
                    <th className="border border-slate-300 p-1.5 text-center w-24">Frekuensi Booking</th>
                    <th className="border border-slate-300 p-1.5 text-right w-36">Estimasi Kontribusi Omset</th>
                  </tr>
                </thead>
                <tbody>
                  {topServices.map((svc, idx) => {
                    const count = Number(svc.bookings_count || 0);
                    const price = Number(svc.price || 0);
                    const subtotal = count * price;
                    return (
                      <tr key={svc.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                        <td className="border border-slate-200 p-1.5 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-200 p-1.5 font-bold text-slate-900">{svc.name}</td>
                        <td className="border border-slate-200 p-1.5 text-right font-semibold">{formatRupiah(price)}</td>
                        <td className="border border-slate-200 p-1.5 text-center font-extrabold text-indigo-700">{count}x Dipesan</td>
                        <td className="border border-slate-200 p-1.5 text-right font-black text-slate-900">{formatRupiah(subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* G. Bagian 5: Buku Besar Rincian Transaksi Reservasi Tamu */}
          <div className="mb-4">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1">
              <span>5. Buku Besar Rincian Transaksi Reservasi Tamu (Detailed Reservation Ledger)</span>
              <span className="text-[8px] font-bold text-slate-400 normal-case">Total {bookingsList.length} Transaksi</span>
            </h3>
            <table className="w-full border-collapse border border-slate-200 text-[8.5px]">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[7.5px]">
                  <th className="border border-slate-300 p-1 text-center w-6">No</th>
                  <th className="border border-slate-300 p-1 text-left">Kode Booking</th>
                  <th className="border border-slate-300 p-1 text-left">Tanggal Order</th>
                  <th className="border border-slate-300 p-1 text-left">Nama Tamu & Kontak</th>
                  <th className="border border-slate-300 p-1 text-left">Tipe Kamar / Unit</th>
                  <th className="border border-slate-300 p-1 text-center">Check-In</th>
                  <th className="border border-slate-300 p-1 text-center">Check-Out</th>
                  <th className="border border-slate-300 p-1 text-center w-10">Malam</th>
                  <th className="border border-slate-300 p-1 text-right">Total Biaya (IDR)</th>
                  <th className="border border-slate-300 p-1 text-left">Bentuk Pelunasan / EDC</th>
                  <th className="border border-slate-300 p-1 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookingsList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="border border-slate-200 p-3 text-center text-slate-400">
                      Tidak ada data transaksi pada rentang periode ini.
                    </td>
                  </tr>
                ) : (
                  bookingsList.map((b, idx) => {
                    const payment = b.latest_payment || b.latestPayment;
                    const pType = (payment?.payment_type || '').toLowerCase();
                    const isPaid = payment?.status === 'PAID';
                    let detailText = '-';

                    if (b.payment_method === 'cash') {
                      if (isPaid && pType) {
                        if (pType === 'cash') detailText = 'Tunai (Kasir)';
                        else if (pType.startsWith('qris_')) detailText = `QRIS ${pType.replace('qris_', '').toUpperCase()}`;
                        else if (pType.startsWith('debit_')) detailText = `Debit ${pType.replace('debit_', '').toUpperCase()}`;
                        else if (pType.startsWith('credit_')) detailText = `CC ${pType.replace('credit_', '').toUpperCase()}`;
                        else detailText = `${pType.toUpperCase()}`;
                      } else {
                        detailText = 'Bayar di Tempat (Pending)';
                      }
                    } else {
                      detailText = (pType || 'Midtrans Snap').toUpperCase();
                    }

                    const assignedRoom = b.assigned_room?.room_number || b.assignedRoom?.room_number || '-';
                    const statusLabel =
                      BOOKING_STATUS_CONFIG[b.status]?.label ||
                      (b.status === 'CONFIRMED'
                        ? 'Terkonfirmasi'
                        : b.status === 'CHECKED_IN'
                        ? 'Check-In'
                        : b.status === 'CHECKED_OUT'
                        ? 'Selesai'
                        : b.status === 'CANCELLED'
                        ? 'Dibatalkan'
                        : b.status === 'EXPIRED'
                        ? 'Hangus'
                        : b.status);

                    return (
                      <tr key={b.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                        <td className="border border-slate-200 p-1 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-200 p-1 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {b.booking_code}
                        </td>
                        <td className="border border-slate-200 p-1 text-slate-600 whitespace-nowrap text-[8px]">
                          {formatDateTime(b.created_at)}
                        </td>
                        <td className="border border-slate-200 p-1">
                          <span className="font-bold text-slate-900 block leading-tight">{b.customer_name}</span>
                          <span className="text-[7.5px] text-slate-500 block leading-tight">{b.customer_phone || b.customer_email || '-'}</span>
                        </td>
                        <td className="border border-slate-200 p-1 text-slate-700">
                          <span className="font-semibold block leading-tight">{b.room_type?.name || b.service_name || '-'}</span>
                          <span className="text-[7.5px] text-slate-500 block leading-tight">Unit: {assignedRoom}</span>
                        </td>
                        <td className="border border-slate-200 p-1 text-center whitespace-nowrap text-[8px]">{b.check_in_date || '-'}</td>
                        <td className="border border-slate-200 p-1 text-center whitespace-nowrap text-[8px]">{b.check_out_date || '-'}</td>
                        <td className="border border-slate-200 p-1 text-center font-bold">{b.total_nights || 1}</td>
                        <td className="border border-slate-200 p-1 text-right font-black text-slate-900 whitespace-nowrap">
                          {formatRupiah(b.total_amount)}
                        </td>
                        <td className="border border-slate-200 p-1 text-[8px] font-semibold text-slate-700 whitespace-nowrap">
                          {detailText}
                        </td>
                        <td className="border border-slate-200 p-1 text-center whitespace-nowrap">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[7.5px] font-bold border border-slate-300 bg-white text-slate-800">
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {bookingsList.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                    <td colSpan={7} className="border border-slate-300 p-1.5 text-right uppercase tracking-wider text-[8px]">
                      TOTAL AKUMULASI BUKU BESAR
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-black">{totalPrintNights}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-black text-emerald-800 text-[9px]">
                      {formatRupiah(totalPrintAmount)}
                    </td>
                    <td colSpan={2} className="border border-slate-300 p-1.5 text-[7.5px] text-slate-600 font-semibold">
                      Total {bookingsList.length} transaksi reservasi
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* H. Bagian 6: Lembar Pengesahan & Tanda Tangan Resmi (Sign-Off Block) */}
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/40 print-avoid-break mt-6">
            <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1 text-center">
              Lembar Pengesahan & Verifikasi Laporan Keuangan Hotel
            </h4>
            <div className="grid grid-cols-3 gap-6 text-center text-[9px] pt-1">
              <div>
                <span className="font-bold text-slate-500 uppercase text-[8px] block">Dibuat Oleh:</span>
                <span className="font-black text-slate-800 block text-[9px]">Front Desk & Night Auditor</span>
                <div className="h-14 flex items-end justify-center">
                  <div className="w-36 border-b border-slate-400"></div>
                </div>
                <span className="text-[8px] text-slate-400 block mt-1">Nama Jelas & Paraf</span>
                <span className="text-[7.5px] text-slate-400 block">Tgl: ____________________</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase text-[8px] block">Diverifikasi Oleh:</span>
                <span className="font-black text-slate-800 block text-[9px]">Financial Controller / Kasir Utama</span>
                <div className="h-14 flex items-end justify-center">
                  <div className="w-36 border-b border-slate-400"></div>
                </div>
                <span className="text-[8px] text-slate-400 block mt-1">Nama Jelas & Paraf</span>
                <span className="text-[7.5px] text-slate-400 block">Tgl: ____________________</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase text-[8px] block">Disetujui Oleh:</span>
                <span className="font-black text-slate-800 block text-[9px]">General Manager Hotel</span>
                <div className="h-14 flex items-end justify-center">
                  <div className="w-36 border-b border-slate-400"></div>
                </div>
                <span className="text-[8px] text-slate-400 block mt-1">Nama Jelas & Tanda Tangan</span>
                <span className="text-[7.5px] text-slate-400 block">Tgl: ____________________</span>
              </div>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-200 text-center">
              <p className="text-[7.5px] text-slate-400 leading-tight">
                * Dokumen laporan keuangan ini dihasilkan secara resmi dan sah oleh Sistem Manajemen Hotel & Front Desk (PMS) The Royal Nusantara Resort & Spa.
                Laporan ini diperuntukkan sebagai dokumen audit resmi, rekonsiliasi kas harian, pelaporan dewan komisaris, dan kepatuhan perpajakan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. EMBEDDED PRINT CSS                                     */}
      {/* ======================================================== */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-report, #printable-report * {
            visibility: visible !important;
          }
          #printable-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 8mm 6mm 10mm 6mm !important;
            display: block !important;
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm 6mm 12mm 6mm;
          }
        }
      `}</style>
    </>
  );
}

