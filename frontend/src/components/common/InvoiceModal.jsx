import React, { useRef } from 'react';
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  Hotel,
  Calendar,
  User,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react';
import {
  formatRupiah,
  formatDate,
  formatDateTime,
  formatCheckoutTime,
  getBookingStayStatus,
} from '../../utils/format';

export default function InvoiceModal({
  isOpen,
  onClose,
  booking,
  payment = null,
}) {
  const invoiceRef = useRef(null);

  if (!isOpen || !booking) return null;

  const currentPayment = payment || booking.latest_payment || booking.payments?.[0] || {};
  const isCash =
    currentPayment.payment_type === 'cash' ||
    String(currentPayment.order_id || '').startsWith('CASH-');

  // Format payment method label
  let paymentMethodLabel = 'Midtrans Online (QRIS / VA / Bank)';
  const pType = currentPayment.payment_type || '';
  if (isCash) {
    paymentMethodLabel = 'Bayar di Tempat (Tunai / Front Desk)';
  } else if (pType.startsWith('qris_')) {
    paymentMethodLabel = `QRIS ${pType.replace('qris_', '').toUpperCase()} (EDC Front Desk)`;
  } else if (pType.startsWith('debit_')) {
    paymentMethodLabel = `Debit Card ${pType.replace('debit_', '').toUpperCase()} (EDC Front Desk)`;
  } else if (pType.startsWith('credit_')) {
    paymentMethodLabel = `Credit Card ${pType.replace('credit_', '').toUpperCase()} (EDC Front Desk)`;
  } else if (pType) {
    paymentMethodLabel = `Midtrans ${pType.toUpperCase()}`;
  }

  const roomName = booking.room_type?.name || booking.service_name || 'Luxury Suite';
  const invoiceNo = `INV/${new Date().getFullYear()}/${booking.booking_code}`;
  const paymentDate = currentPayment.paid_at || currentPayment.updated_at || booking.created_at;

  const isPaid =
    currentPayment.status === 'PAID' ||
    booking.payment_status === 'PAID' ||
    Boolean(currentPayment.paid_at);

  const stayStatus = getBookingStayStatus(booking.check_in_date, booking.check_out_date);
  const isHangus =
    booking.status === 'NO_SHOW' ||
    (booking.status === 'CONFIRMED' && stayStatus === 'OVERDUE');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Controls Bar (Hidden during Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Hotel className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm">Invoice Resmi Pembayaran</h3>
              <p className="text-[11px] text-slate-400 font-mono">{invoiceNo}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="py-1.5 px-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold rounded-xl shadow transition flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Unduh / Cetak PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div
          ref={invoiceRef}
          id="printable-invoice"
          className="p-6 sm:p-10 overflow-y-auto space-y-6 text-slate-800 bg-white"
        >
          {/* Header Resort Brand */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-white shadow-sm font-bold">
                  <Hotel className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-black text-lg text-slate-900 tracking-tight leading-tight">
                    THE ROYAL NUSANTARA
                  </h1>
                  <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                    Luxury Hotel & Beach Resort
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 max-w-sm pt-1">
                Kawasan Pariwisata Nusa Dua Lot NW-1, Bali 80363, Indonesia
                <br />
                Telp: +62 361 889 000 | Email: billing@theroyalnusantara.com
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="text-2xl font-black tracking-wider text-slate-900 block font-mono">
                INVOICE
              </span>
              <p className="text-xs font-mono font-bold text-amber-800">{invoiceNo}</p>
              
              {/* Payment & Reservation Status Badges */}
              <div className="flex flex-col sm:items-end gap-1 mt-1">
                {isPaid ? (
                  <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>LUNAS / PAID</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>TIDAK DIBAYAR</span>
                  </div>
                )}

                {isHangus && (
                  <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>RESERVASI HANGUS</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hangus Banner Notification */}
          {isHangus && (
            <div
              className={`p-3.5 rounded-2xl border flex items-start space-x-3 text-xs ${
                isPaid
                  ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isPaid ? 'text-amber-600' : 'text-rose-600'
                }`}
              />
              <div className="space-y-0.5">
                <span className="font-black uppercase tracking-wide block">
                  {isPaid
                    ? 'Status Reservasi: Lunas (Hangus / Tidak Digunakan)'
                    : 'Status Reservasi: Hangus (Tidak Dibayar)'}
                </span>
                <p className="text-[11px] leading-relaxed">
                  {isPaid
                    ? `Pembayaran sebesar ${formatRupiah(booking.total_amount)} telah terverifikasi LUNAS, namun reservasi telah HANGUS karena melewati batas waktu menginap tanpa adanya kedatangan (check-in) tamu. Sesuai kebijakan hotel, pembayaran yang hangus tidak dapat dikembalikan.`
                    : 'Reservasi ini telah HANGUS secara otomatis oleh sistem karena melewati batas masa menginap tanpa kedatangan tamu. Tagihan bayar di tempat tidak pernah diselesaikan.'}
                </p>
              </div>
            </div>
          )}

          {/* Meta Info: Guest & Stay Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Guest Info */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Ditagihkan Kepada (Guest Info)
              </span>
              <p className="font-bold text-slate-900 text-sm">{booking.customer_name}</p>
              <p className="text-slate-600">{booking.customer_email}</p>
              <p className="text-slate-600">{booking.customer_phone || '-'}</p>
              <p className="text-slate-500 text-[11px] pt-1">
                Tamu: {booking.total_adults || 1} Dewasa
                {Number(booking.total_children || 0) > 0 ? `, ${booking.total_children} Anak` : ''}
              </p>
            </div>

            {/* Stay Info with Explicit Check-Out Hour */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Rincian Reservasi & Waktu Menginap
              </span>
              <p className="font-bold text-slate-900 text-sm">{roomName}</p>
              {booking.room?.room_number && (
                <p className="text-indigo-700 font-semibold">
                  Unit Kamar: #{booking.room.room_number} (Lt. {booking.room.floor})
                </p>
              )}
              <div className="text-[11px] text-slate-700 space-y-0.5 pt-1">
                <div>
                  <span className="text-slate-500 font-medium">Check-In: </span>
                  <span className="font-bold text-slate-900">
                    {formatDate(booking.check_in_date)} Pukul 14:00 WIB
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Check-Out: </span>
                  <span className="font-bold text-amber-900">
                    {formatCheckoutTime(booking.check_out_date, booking.checked_out_at)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Durasi: </span>
                  <span className="font-semibold text-slate-800">{booking.total_nights || 1} Malam</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Status Reservasi: </span>
                  {isHangus ? (
                    <span className="font-black text-rose-700">Hangus (Tidak Hadir)</span>
                  ) : (
                    <span className="font-bold text-emerald-700">{booking.status || 'Terkonfirmasi'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Deskripsi Layanan / Item</th>
                  <th className="py-3 px-4 text-center">Durasi / Qty</th>
                  <th className="py-3 px-4 text-right">Tarif</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Room Charge */}
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    Sewa Suite: {roomName}
                    <span className="block text-[10px] text-slate-400 font-normal">
                      Akomodasi kamar mewah The Royal Nusantara
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                    {booking.total_nights || 1} Malam
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-600">
                    {formatRupiah((booking.room_amount || booking.total_amount * 0.9) / (booking.total_nights || 1))}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                    {formatRupiah(booking.room_amount || booking.total_amount * 0.9)}
                  </td>
                </tr>

                {/* Add-on Extra Services */}
                {booking.extra_items &&
                  booking.extra_items.map((extra) => (
                    <tr key={extra.id} className="bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-800 font-medium">
                        • {extra.extra_service?.name || extra.service_name} (Add-On)
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">
                        x{extra.quantity}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {formatRupiah(extra.unit_price || extra.subtotal / extra.quantity)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {formatRupiah(extra.subtotal)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            {/* Payment Method & Proof Info */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5 flex-1 max-w-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Informasi Pembayaran
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">Metode:</span>
                <span className="font-bold text-slate-900">{paymentMethodLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID / Ref:</span>
                <span className="font-mono text-slate-800">{currentPayment.order_id || booking.booking_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal Bayar:</span>
                <span className="text-slate-700">
                  {isPaid ? formatDateTime(paymentDate) : '— (Belum Diselesaikan)'}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Status Pembayaran:</span>
                {isPaid ? (
                  <span className="font-bold text-emerald-700 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Terverifikasi Lunas</span>
                  </span>
                ) : (
                  <span className="font-bold text-rose-700 flex items-center space-x-1">
                    <XCircle className="w-3 h-3 text-rose-600" />
                    <span>{isHangus ? 'Dibatalkan (Hangus)' : 'Belum Lunas'}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Biaya:</span>
                <span className="font-semibold text-slate-900">
                  {formatRupiah(booking.room_amount || booking.total_amount * 0.9)}
                </span>
              </div>

              {Number(booking.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                  <span>Diskon Promo ({booking.discount_code}):</span>
                  <span>-{formatRupiah(booking.discount_amount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Pajak & Layanan Hotel (10%):</span>
                <span className="font-semibold text-slate-900">
                  {formatRupiah(booking.tax_amount || booking.total_amount * 0.1)}
                </span>
              </div>

              <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-center text-sm">
                <span className="font-black text-slate-900 uppercase tracking-wide">
                  {isPaid ? 'Total Lunas:' : isHangus ? 'Total Tagihan (Hangus):' : 'Total Tagihan:'}
                </span>
                <span className="text-xl font-black text-amber-700">
                  {formatRupiah(booking.total_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Stamp & Footer */}
          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs text-slate-500">
            <div className="space-y-1">
              <p className="font-semibold text-slate-700">Catatan & Ketentuan Reservasi:</p>
              <p className="text-[10px] text-slate-400 max-w-md leading-relaxed">
                1. Standar Check-In hotel pukul 14:00 WIB dan Check-Out maksimal pukul 12:00 WIB.
                <br />
                2. Simpan atau cetak invoice ini sebagai bukti kepemilikan reservasi sah saat proses check-in.
                <br />
                3. Invoice ini telah diverifikasi secara elektronik dan sah tanpa tanda tangan basah.
              </p>
            </div>

            {/* Digital Stamp Simulation */}
            {isPaid ? (
              <div
                className={`text-center sm:text-right border-2 border-dashed rounded-2xl p-3 ${
                  isHangus
                    ? 'border-amber-500/60 bg-amber-50/40'
                    : 'border-emerald-600/40 bg-emerald-50/30'
                }`}
              >
                <div
                  className={`text-[10px] font-mono uppercase tracking-widest font-bold ${
                    isHangus ? 'text-amber-800' : 'text-emerald-800'
                  }`}
                >
                  {isHangus ? '★ VERIFIED • HANGUS ★' : '★ VERIFIED OFFICIAL ★'}
                </div>
                <div
                  className={`font-black text-xs tracking-tight ${
                    isHangus ? 'text-amber-900' : 'text-emerald-900'
                  }`}
                >
                  THE ROYAL NUSANTARA FINANCE
                </div>
                <div
                  className={`text-[9px] font-mono ${
                    isHangus ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {isHangus ? 'LUNAS (RESERVASI HANGUS)' : 'LUNAS'} • {formatDate(paymentDate)}
                </div>
              </div>
            ) : (
              <div className="text-center sm:text-right border-2 border-dashed border-rose-400/60 rounded-2xl p-3 bg-rose-50/30">
                <div className="text-[10px] font-mono uppercase tracking-widest text-rose-800 font-bold">
                  ★ VOID • TIDAK DIBAYAR ★
                </div>
                <div className="font-black text-xs text-rose-900 tracking-tight">
                  THE ROYAL NUSANTARA FINANCE
                </div>
                <div className="text-[9px] font-mono text-rose-700">
                  {isHangus ? 'HANGUS (TIDAK DIBAYAR)' : 'BELUM DIBAYAR'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-black rounded-xl shadow transition flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh / Cetak Invoice (PDF)</span>
          </button>
        </div>
      </div>

      {/* Embedded Print CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible;
          }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20mm;
          }
        }
      `}</style>
    </div>
  );
}

