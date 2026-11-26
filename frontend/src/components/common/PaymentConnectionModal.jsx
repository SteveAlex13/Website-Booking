import React from 'react';
import { WifiOff, RefreshCw, ShieldCheck, AlertCircle, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PaymentConnectionModal({
  isOpen,
  onClose,
  onRetry,
  onCheckStatus,
  checking = false,
  title = 'Koneksi Internet Terganggu / Sinyal Tidak Stabil',
  message = 'Sistem mendeteksi koneksi internet Anda mengalami timeout atau terputus saat memproses transaksi pembayaran.',
  bookingCode = '',
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="p-5 bg-gradient-to-r from-amber-600 to-rose-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">Pemberitahuan Pembayaran</h3>
              <p className="text-[11px] text-amber-100">Koneksi Sinyal Lemah / Timeout Jaringan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white transition"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-xs text-rose-900">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-950">Pembayaran Belum Berhasil Dikonfirmasi</p>
              <p className="mt-1 text-[11px] text-rose-800 leading-relaxed">{message}</p>
            </div>
          </div>

          {/* Double Payment Prevention Guarantee Box */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Jaminan Keamanan: Anti Tagihan / Debet Ganda</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed pl-6">
              Jika saldo rekening atau e-wallet Anda sempat terpotong saat sinyal terputus, <strong>JANGAN KHAWATIR</strong>. Sistem kami secara otomatis mencocokkan status ke server Midtrans. Dana Anda aman dan sistem tidak akan mengizinkan penarikan ulang.
            </p>
          </div>

          {bookingCode && (
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-slate-500 font-medium">Kode Reservasi Anda:</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {bookingCode}
              </span>
            </div>
          )}

          <p className="text-[11px] text-slate-500 text-center">
            Pilih tindakan di bawah untuk memverifikasi atau mengulang pembayaran:
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col gap-2.5">
          {onCheckStatus && (
            <button
              type="button"
              disabled={checking}
              onClick={onCheckStatus}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Memverifikasi ke Server...' : 'Periksa Status Pembayaran (Cegah Bayar Ganda)'}</span>
            </button>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5"
              >
                <span>Coba Bayar Lagi</span>
              </button>
            )}

            <Link
              to="/customer/dashboard"
              className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 text-center"
            >
              <span>Dashboard Reservasi Saya</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

