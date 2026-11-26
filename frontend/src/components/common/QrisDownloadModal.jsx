import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, X, Check, Copy, QrCode, ShieldCheck, Sparkles } from 'lucide-react';
import { formatRupiah, formatDateTime } from '../../utils/format';

export default function QrisDownloadModal({
  isOpen,
  onClose,
  booking,
  grossAmount,
  bank = 'Semua Bank / E-Wallet',
}) {
  const canvasRef = useRef(null);
  const compositeCanvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const amount = Number(grossAmount ?? booking?.total_amount ?? 0);
  const bookingCode = booking?.booking_code || 'TRN-BOOKING';
  const customerName = booking?.customer_name || 'Tamu Terhormat';
  const roomName = booking?.room_type?.name || booking?.service_name || 'Luxury Suite';

  // Realistic Indonesian QRIS Payload representation (EMVCo format structure)
  const qrisPayload = `00020101021226670016ID.CO.ROYAL.WWW01189360091800000000000215ID10202611239900303UME51440014ID.LINKAJA.WWW0215ID10202611239900303UME520458125303360540${amount.toFixed(0).length}${amount.toFixed(0)}5802ID5919THE ROYAL NUSANTARA6007DENPASAR61058036162230119${bookingCode}6304ABCD`;

  useEffect(() => {
    if (!isOpen) return;

    // 1. Generate QR Code onto main canvas
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        qrisPayload,
        {
          width: 260,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) console.error('QR code generation error:', err);
          else drawCompositeFlyer();
        }
      );
    }
  }, [isOpen, amount, bookingCode]);

  // Draw full official QRIS flyer onto offscreen canvas for high-res PNG download
  const drawCompositeFlyer = () => {
    const flyerCanvas = compositeCanvasRef.current;
    const qrCanvas = canvasRef.current;
    if (!flyerCanvas || !qrCanvas) return;

    const ctx = flyerCanvas.getContext('2d');
    const width = 600;
    const height = 820;
    flyerCanvas.width = width;
    flyerCanvas.height = height;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Top Red Header Banner
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(12, 12, width - 24, 76);

    // Header Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QRIS', width / 2, 48);

    ctx.font = '600 13px sans-serif';
    ctx.fillText('PEMBAYARAN DIGITAL NASIONAL BERSTANDAR BI', width / 2, 70);

    // Merchant Info
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('THE ROYAL NUSANTARA', width / 2, 128);

    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.fillText('NMID: ID1020261123990 • A01', width / 2, 150);

    // Divider
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 168);
    ctx.lineTo(width - 40, 168);
    ctx.stroke();

    // Booking Details Box
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(40, 180, width - 80, 70);
    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(40, 180, width - 80, 70);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText('Kode Reservasi:', 60, 206);
    ctx.fillText('Nama Tamu / Suite:', 60, 232);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(bookingCode, width - 60, 206);

    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`${customerName} (${roomName.slice(0, 22)})`, width - 60, 232);

    // Draw QR Code
    const qrSize = 300;
    const qrX = (width - qrSize) / 2;
    const qrY = 270;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // Nominal Box
    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(50, 590, width - 100, 75);
    ctx.strokeStyle = '#fde68a';
    ctx.strokeRect(50, 590, width - 100, 75);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('TOTAL NOMINAL TAGIHAN', width / 2, 615);

    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(formatRupiah(amount), width / 2, 648);

    // Instructions & Supported Apps
    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.fillText('Pindai (Scan) melalui BCA, BRImo, Livin Mandiri, BNI, GoPay, OVO, DANA, ShopeePay', width / 2, 695);
    ctx.fillText('dan seluruh aplikasi mobile banking / dompet digital Indonesia.', width / 2, 715);

    // Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText(`Dicetak / Digenerate pada: ${formatDateTime(new Date().toISOString())} • The Royal Nusantara Resort`, width / 2, 765);
    ctx.fillText('Sistem Pembayaran Terverifikasi Otomatis', width / 2, 785);
  };

  const handleDownloadImage = () => {
    setDownloading(true);
    try {
      drawCompositeFlyer();
      const flyerCanvas = compositeCanvasRef.current;
      if (!flyerCanvas) return;

      const imageURI = flyerCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `QRIS-The-Royal-Nusantara-${bookingCode}.png`;
      link.href = imageURI;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download QRIS:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    drawCompositeFlyer();
    const flyerCanvas = compositeCanvasRef.current;
    if (!flyerCanvas) return;

    const imageURI = flyerCanvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak QRIS - ${bookingCode}</title>
          <style>
            @page { size: auto; margin: 15mm; }
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; }
            img { max-width: 100%; height: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          </style>
        </head>
        <body>
          <img src="${imageURI}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const copyBookingCode = () => {
    navigator.clipboard.writeText(bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">QRIS Nasional Pembayaran</h3>
              <p className="text-[10px] text-red-100">Bisa di-scan & diunduh sebagai gambar PNG</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white transition"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-center">
          {/* Card Presentation */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 shadow-inner">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Merchant</span>
                <span className="text-xs font-black text-slate-900">The Royal Nusantara</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Penerima</span>
                <span className="text-xs font-black text-amber-700">{bank}</span>
              </div>
            </div>

            {/* QR Code Canvas */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm inline-block mx-auto my-1">
              <canvas ref={canvasRef} className="mx-auto rounded-lg" />
              <div className="text-[10px] font-mono text-slate-400 mt-1">NMID: ID1020261123990</div>
            </div>

            {/* Amount */}
            <div className="mt-3 bg-amber-50 rounded-xl p-2.5 border border-amber-200/70">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Total Tagihan Pembayaran
              </span>
              <span className="text-xl font-black text-amber-900">{formatRupiah(amount)}</span>
            </div>

            {/* Booking Code copy */}
            <div className="mt-2.5 flex items-center justify-between text-xs px-2 py-1 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 text-[11px]">Kode Reservasi:</span>
              <button
                type="button"
                onClick={copyBookingCode}
                className="font-mono font-bold text-slate-800 flex items-center space-x-1 hover:text-amber-700 transition"
                title="Salin Kode Reservasi"
              >
                <span>{bookingCode}</span>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Dukung seluruh mobile banking (BCA, Mandiri, BRI, BNI) serta e-wallet (GoPay, OVO, DANA, ShopeePay).
          </p>

          {/* Offscreen Canvas for composite flyer download */}
          <canvas ref={compositeCanvasRef} style={{ display: 'none' }} />
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={downloading}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Memproses Unduhan...' : 'Unduh QRIS (PNG)'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5"
            title="Cetak format cetak siap print"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak QRIS</span>
          </button>
        </div>
      </div>
    </div>
  );
}

