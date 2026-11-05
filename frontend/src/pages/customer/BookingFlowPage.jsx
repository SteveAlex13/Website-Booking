import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { serviceService } from '../../services/serviceService';
import { bookingService } from '../../services/bookingService';
import { paymentService } from '../../services/paymentService';
import { useToast } from '../../contexts/ToastContext';
import { formatRupiah, formatDate } from '../../utils/format';
import { loadSnapScript, openSnapModal } from '../../utils/midtrans';
import {
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  Sparkles,
  Star,
  Coffee,
  Check,
  Plus,
  Minus,
  DoorOpen,
} from 'lucide-react';

export default function BookingFlowPage() {
  const { serviceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [roomType, setRoomType] = useState(null);
  const [extraServices, setExtraServices] = useState([]);
  const [loadingRoom, setLoadingRoom] = useState(true);

  // Form State
  const [checkIn, setCheckIn] = useState(searchParams.get('check_in') || today);
  const [checkOut, setCheckOut] = useState(searchParams.get('check_out') || tomorrow);
  const [adults, setAdults] = useState(Number(searchParams.get('adults') || 2));
  const [children, setChildren] = useState(Number(searchParams.get('children') || 0));

  // Customer Contact Info
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [specialRequests, setSpecialRequests] = useState('');

  // Selected Extras: { [extraId]: quantity }
  const [selectedExtras, setSelectedExtras] = useState({});

  // Price calculation from backend
  const [priceCalculation, setPriceCalculation] = useState(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Room Type & Extra Services
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomRes, extrasRes] = await Promise.all([
          serviceService.getRoomType(serviceId),
          serviceService.getExtraServices(),
        ]);
        if (roomRes.data) setRoomType(roomRes.data.room_type);
        if (extrasRes.data) setExtraServices(extrasRes.data);
      } catch (err) {
        toast.error('Gagal memuat detail tipe kamar.');
      } finally {
        setLoadingRoom(false);
      }
    };
    fetchData();
  }, [serviceId]);

  // Recalculate price when dates or extras change
  useEffect(() => {
    if (!roomType || !checkIn || !checkOut || checkIn >= checkOut) return;

    const calculate = async () => {
      setCalculatingPrice(true);
      try {
        const extrasPayload = Object.entries(selectedExtras)
          .filter(([_, qty]) => qty > 0)
          .map(([id, quantity]) => ({ id: Number(id), quantity }));

        const res = await serviceService.calculatePrice({
          room_type_id: roomType.id,
          check_in_date: checkIn,
          check_out_date: checkOut,
          extras: extrasPayload,
        });

        if (res.data) {
          setPriceCalculation(res.data);
        }
      } catch (err) {
        console.error('Calculate price error:', err);
      } finally {
        setCalculatingPrice(false);
      }
    };

    const timer = setTimeout(calculate, 300);
    return () => clearTimeout(timer);
  }, [roomType, checkIn, checkOut, selectedExtras]);

  // Handle Extras Toggle / Quantity
  const handleExtraToggle = (extraId) => {
    setSelectedExtras((prev) => {
      const current = prev[extraId] || 0;
      if (current > 0) {
        const next = { ...prev };
        delete next[extraId];
        return next;
      } else {
        return { ...prev, [extraId]: 1 };
      }
    });
  };

  const handleExtraQuantity = (extraId, delta) => {
    setSelectedExtras((prev) => {
      const current = prev[extraId] || 0;
      const updated = Math.max(1, current + delta);
      return { ...prev, [extraId]: updated };
    });
  };

  // Submit Booking & Midtrans Checkout
  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.info('Silakan login terlebih dahulu untuk menyelesaikan reservasi.');
      navigate(`/login?redirect=/book/${serviceId}`);
      return;
    }

    if (checkIn >= checkOut) {
      toast.error('Tanggal check-out harus setelah tanggal check-in.');
      return;
    }

    if (priceCalculation && !priceCalculation.is_available) {
      toast.error('Kamar ini penuh pada rentang tanggal yang dipilih. Silakan pilih tanggal lain.');
      return;
    }

    setSubmitting(true);
    try {
      const extrasPayload = Object.entries(selectedExtras)
        .filter(([_, qty]) => qty > 0)
        .map(([id, quantity]) => ({ id: Number(id), quantity }));

      const bookingPayload = {
        room_type_id: roomType.id,
        check_in_date: checkIn,
        check_out_date: checkOut,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        total_adults: adults,
        total_children: children,
        special_requests: specialRequests,
        extras: extrasPayload,
      };

      // 1. Create Booking
      const bookingRes = await bookingService.createBooking(bookingPayload);
      const newBooking = bookingRes.data;

      toast.success(`Reservasi ${newBooking.booking_code} berhasil dibuat! Membuka Midtrans...`);

      // 2. Trigger Midtrans Snap Checkout
      const checkoutRes = await paymentService.checkout(newBooking.id);
      const { snap_token, client_key, payment_id } = checkoutRes.data;

      // 3. Load & Open Snap
      const isProduction = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true';
      await loadSnapScript(client_key || import.meta.env.VITE_MIDTRANS_CLIENT_KEY, isProduction);

      // Fallback check
      if (snap_token.startsWith('SIMULATED_') || snap_token.startsWith('SANDBOX_FALLBACK_')) {
        navigate(`/payment-result/${payment_id}`);
        return;
      }

      openSnapModal(snap_token, {
        onSuccess: (result) => {
          toast.success('Pembayaran sukses terverifikasi!');
          navigate(`/payment-result/${payment_id}`);
        },
        onPending: (result) => {
          toast.info('Menunggu penyelesaian pembayaran QRIS.');
          navigate('/customer/dashboard');
        },
        onError: (result) => {
          toast.error('Pembayaran gagal atau dibatalkan.');
          navigate('/customer/dashboard');
        },
        onClose: () => {
          navigate('/customer/dashboard');
        },
      });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Terjadi kesalahan saat memproses booking.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRoom) {
    return (
      <div className="py-32 text-center text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-600 border-t-transparent mx-auto mb-3"></div>
        Menyiapkan detail suite hotel...
      </div>
    );
  }

  if (!roomType) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Tipe Kamar Tidak Ditemukan</h2>
        <Link to="/services" className="text-amber-600 font-bold hover:underline">
          Kembali ke Koleksi Kamar
        </Link>
      </div>
    );
  }

  const nights = priceCalculation?.nights || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/services"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-amber-700 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Katalog Kamar</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Booking Form & Add-ons */}
        <div className="lg:col-span-2 space-y-8">
          {/* Room Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row gap-6 items-center">
            <img
              src={roomType.image_url}
              alt={roomType.name}
              className="w-full sm:w-44 h-36 rounded-2xl object-cover bg-slate-900 shadow-sm"
              onError={(e) => {
                e.target.src =
                  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80';
              }}
            />
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-amber-500 text-xs font-bold">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>Luxury 5-Star Suite</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900">{roomType.name}</h1>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {roomType.description}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs text-slate-700">
                <span className="bg-slate-100 px-3 py-1 rounded-lg font-semibold">
                  🛏️ {roomType.bed_type}
                </span>
                <span className="bg-slate-100 px-3 py-1 rounded-lg font-semibold">
                  👥 Max {roomType.max_occupancy} Tamu
                </span>
                <span className="bg-slate-100 px-3 py-1 rounded-lg font-semibold">
                  📐 {roomType.size_sqm} m²
                </span>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleBookingSubmit} id="hotel-booking-form" className="space-y-8">
            {/* Step 1: Stay Dates */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black flex items-center justify-center text-xs">
                  1
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Tanggal Menginap & Tamu</h3>
                  <p className="text-xs text-slate-400">Tentukan periode reservasi Anda</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tanggal Check-In *
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={checkIn}
                    onChange={(e) => {
                      setCheckIn(e.target.value);
                      if (e.target.value >= checkOut) {
                        const nextD = new Date(e.target.value);
                        nextD.setDate(nextD.getDate() + 1);
                        setCheckOut(nextD.toISOString().split('T')[0]);
                      }
                    }}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tanggal Check-Out *
                  </label>
                  <input
                    type="date"
                    min={checkIn}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Dewasa (Adults)
                  </label>
                  <select
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold cursor-pointer"
                  >
                    <option value={1}>1 Orang</option>
                    <option value={2}>2 Orang</option>
                    <option value={3}>3 Orang</option>
                    <option value={4}>4 Orang</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Anak-anak (Children)
                  </label>
                  <select
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold cursor-pointer"
                  >
                    <option value={0}>0 Anak</option>
                    <option value={1}>1 Anak</option>
                    <option value={2}>2 Anak</option>
                  </select>
                </div>
              </div>

              {/* Availability Notice */}
              {priceCalculation && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-center space-x-3 ${
                    priceCalculation.is_available
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {priceCalculation.is_available ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold">Kamar Siap & Tersedia!</span>
                        <span className="block text-[11px] text-emerald-700">
                          Tersedia {priceCalculation.available_rooms_count} unit untuk periode {nights} malam ({formatDate(checkIn)} - {formatDate(checkOut)}).
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold">Kamar Penuh pada Tanggal Ini</span>
                        <span className="block text-[11px] text-rose-700">
                          Silakan pilih rentang tanggal lain untuk melanjutkan reservasi.
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Guest Details */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black flex items-center justify-center text-xs">
                  2
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Informasi Kontak Tamu</h3>
                  <p className="text-xs text-slate-400">Konfirmasi reservasi dan tiket akan dikirimkan ke email ini</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nama Lengkap Tamu *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama sesuai KTP / Paspor"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nomor WhatsApp / HP *
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Alamat Email *
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="alamat@email.com"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Permintaan Khusus (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Contoh: Permintaan lantai atas, ranjang bayi (baby cot), or early check-in jika memungkinkan."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Add-on Experiences & Services */}
            {extraServices.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
                <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black flex items-center justify-center text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Layanan Tambahan Mewah (Add-Ons)</h3>
                    <p className="text-xs text-slate-400">Pilih pengalaman ekstra untuk menyempurnakan masa inap Anda</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {extraServices.map((extra) => {
                    const isSelected = !!selectedExtras[extra.id];
                    const qty = selectedExtras[extra.id] || 1;

                    return (
                      <div
                        key={extra.id}
                        className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleExtraToggle(extra.id)}
                            className="mt-1 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                          />
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">
                              {extra.name}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 max-w-md">
                              {extra.description}
                            </p>
                            <span className="text-xs font-black text-amber-700 mt-1 block">
                              +{formatRupiah(extra.price)}{' '}
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({extra.price_type === 'per_stay' ? 'per masa inap' : 'per malam'})
                              </span>
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center space-x-2 self-end sm:self-center pl-7 sm:pl-0">
                            <span className="text-xs font-semibold text-slate-600">Jumlah:</span>
                            <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-white">
                              <button
                                type="button"
                                onClick={() => handleExtraQuantity(extra.id, -1)}
                                className="p-1.5 text-slate-600 hover:bg-slate-100"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-3 text-xs font-bold text-slate-900">{qty}</span>
                              <button
                                type="button"
                                onClick={() => handleExtraQuantity(extra.id, 1)}
                                className="p-1.5 text-slate-600 hover:bg-slate-100"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right Col: Price Breakdown & Instant Checkout */}
        <div className="space-y-6">
          <div className="sticky top-24 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xl space-y-6">
            <h3 className="font-black text-slate-900 text-lg border-b border-slate-100 pb-3">
              Ringkasan Reservasi
            </h3>

            {/* Dates summary */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Check-In:</span>
                <span className="font-bold text-slate-900">{formatDate(checkIn)} (14:00)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Check-Out:</span>
                <span className="font-bold text-slate-900">{formatDate(checkOut)} (12:00)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Durasi:</span>
                <span className="font-bold text-amber-700">{nights} Malam</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tamu:</span>
                <span className="font-bold text-slate-900">
                  {adults} Dewasa{children > 0 ? `, ${children} Anak` : ''}
                </span>
              </div>
            </div>

            {/* Cost Details */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Biaya Kamar ({nights} malam):</span>
                <span className="font-bold text-slate-900">
                  {formatRupiah(priceCalculation?.room_cost?.total_room_amount || roomType.base_price_per_night * nights)}
                </span>
              </div>

              {priceCalculation?.extras_total > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Layanan Tambahan:</span>
                  <span className="font-bold text-slate-900">
                    {formatRupiah(priceCalculation.extras_total)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-900">
                  {formatRupiah(priceCalculation?.subtotal || roomType.base_price_per_night * nights)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Pajak & Layanan Hotel (10%):</span>
                <span className="font-bold text-slate-900">
                  {formatRupiah(priceCalculation?.tax_and_service || (roomType.base_price_per_night * nights * 0.1))}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                    Total Pembayaran
                  </span>
                  <span className="text-[10px] text-slate-400">Termasuk pajak 10%</span>
                </div>
                <span className="text-2xl font-black text-amber-700">
                  {formatRupiah(priceCalculation?.grand_total || (roomType.base_price_per_night * nights * 1.1))}
                </span>
              </div>
            </div>

            {/* Midtrans Snap Guarantee */}
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                <span>Midtrans Snap Instant QRIS</span>
              </div>
              <p className="text-[10px] text-amber-800 leading-relaxed">
                Kamar langsung dikunci 15 menit. Anda dapat membayar langsung dengan scan QRIS Gopay, BCA, Mandiri, ShopeePay atau Virtual Account.
              </p>
            </div>

            {/* Checkout Action Button */}
            <button
              type="submit"
              form="hotel-booking-form"
              disabled={submitting || (priceCalculation && !priceCalculation.is_available)}
              className="w-full py-4 px-6 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black rounded-2xl shadow-lg shadow-amber-600/30 transition transform hover:-translate-y-0.5 text-xs flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
              ) : (
                <>
                  <span>Bayar Sekarang via QRIS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
