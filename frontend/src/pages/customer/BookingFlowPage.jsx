import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { serviceService } from '../../services/serviceService';
import { bookingService } from '../../services/bookingService';
import { paymentService } from '../../services/paymentService';
import { useToast } from '../../contexts/ToastContext';
import { formatRupiah, formatDate, formatRoomCapacity, formatRoomSize } from '../../utils/format';
import RoomImage from '../../components/common/RoomImage';
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
  Tag,
  TicketPercent,
  X,
  Banknote,
} from 'lucide-react';

export default function BookingFlowPage() {
  const { serviceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isCustomer } = useAuth();
  const isStaff = isAuthenticated && !isCustomer; // front desk and super admin cannot book rooms
  const toast = useToast();

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [roomType, setRoomType] = useState(null);
  const [extraServices, setExtraServices] = useState([]);
  const [availableCoupons, setAvailableCoupons] = useState([]);
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

  // Coupon / Discount State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Payment Method: 'midtrans' | 'cash'
  const [paymentMethod, setPaymentMethod] = useState('midtrans');

  // Price calculation from backend
  const [priceCalculation, setPriceCalculation] = useState(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isOverbookedModalOpen, setIsOverbookedModalOpen] = useState(false);

  // Fetch Room Type, Extra Services & Available Coupons
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomRes, extrasRes, couponsRes] = await Promise.allSettled([
          serviceService.getRoomType(serviceId),
          serviceService.getExtraServices(),
          serviceService.getActiveCoupons(),
        ]);

        if (roomRes.status === 'fulfilled' && roomRes.value?.data) {
          const raw = roomRes.value.data;
          setRoomType(raw?.room_type || raw);
        } else {
          toast.error('Gagal memuat detail tipe kamar.');
        }

        if (extrasRes.status === 'fulfilled' && extrasRes.value?.data) {
          const rawExtras = Array.isArray(extrasRes.value.data)
            ? extrasRes.value.data
            : extrasRes.value.data?.data || [];
          setExtraServices(rawExtras);
        }

        if (couponsRes.status === 'fulfilled' && couponsRes.value?.data) {
          const rawCoupons = Array.isArray(couponsRes.value.data)
            ? couponsRes.value.data
            : couponsRes.value.data?.data || [];
          setAvailableCoupons(rawCoupons);
        }
      } catch (err) {
        toast.error('Gagal memuat detail reservasi.');
      } finally {
        setLoadingRoom(false);
      }
    };
    fetchData();
  }, [serviceId]);

  // Keep the guest counts inside what this room allows
  useEffect(() => {
    if (!roomType) return;
    if (roomType.max_adults) {
      setAdults((a) => Math.min(Math.max(a, 1), Number(roomType.max_adults)));
    }
    if (roomType.max_children !== undefined && roomType.max_children !== null) {
      setChildren((c) => Math.min(c, Number(roomType.max_children)));
    }
  }, [roomType]);

  // Recalculate price when dates, extras, or applied coupon change
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
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
        });

        if (res.data) {
          setPriceCalculation(res.data);
          if (res.data.coupon) {
            setAppliedCoupon((prev) => ({
              ...prev,
              ...res.data.coupon,
              discount_amount: res.data.discount_amount,
            }));
          } else if (appliedCoupon && Number(res.data.discount_amount || 0) === 0) {
            if (res.data.coupon_message) {
              setCouponError(res.data.coupon_message);
              setCouponSuccess('');
            }
          }
        }
      } catch (err) {
        console.error('Calculate price error:', err);
      } finally {
        setCalculatingPrice(false);
      }
    };

    const timer = setTimeout(calculate, 300);
    return () => clearTimeout(timer);
  }, [roomType, checkIn, checkOut, selectedExtras, appliedCoupon?.code]);

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

  // Handle Coupon Apply
  const handleApplyCoupon = async (codeToApply) => {
    const code = (codeToApply || couponCodeInput || '').trim().toUpperCase();
    if (!code) {
      setCouponError('Silakan masukkan kode promo / kupon.');
      return;
    }

    setCouponLoading(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const currentSubtotal = priceCalculation?.subtotal || (Number(roomType?.base_price_per_night || 0));
      const res = await serviceService.validateCoupon(code, currentSubtotal);

      if (res.data) {
        setAppliedCoupon(res.data);
        setCouponCodeInput(res.data.code);
        setCouponSuccess(`Kupon "${res.data.name}" aktif!`);
        toast.success(`Kupon ${res.data.code} berhasil diterapkan!`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || `Kode kupon "${code}" tidak valid atau tidak memenuhi syarat.`;
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setCouponLoading(false);
    }
  };

  // Handle Coupon Remove
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError('');
    setCouponSuccess('');
    toast.info('Kupon diskon dihapus.');
  };

  // Submit Booking & Midtrans Checkout
  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.info('Silakan login terlebih dahulu untuk menyelesaikan reservasi.');
      navigate(`/login?redirect=/book/${serviceId}`);
      return;
    }

    if (isStaff) {
      toast.error('Akun staf tidak dapat memesan kamar. Gunakan akun tamu (customer).');
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
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        payment_method: paymentMethod,
      };

      // 1. Create Booking
      const bookingRes = await bookingService.createBooking(bookingPayload);
      const newBooking = bookingRes.data;

      // 2. If Cash Payment: skip Midtrans, redirect directly to confirmation receipt
      if (paymentMethod === 'cash') {
        const cashPaymentId =
          newBooking.latest_payment?.id ||
          newBooking.payments?.[0]?.id ||
          newBooking.id;

        toast.success(`Reservasi ${newBooking.booking_code} berhasil! Silakan bayar di tempat saat Check-In.`);
        navigate(`/payment-result/${cashPaymentId}`);
        return;
      }

      toast.success(`Reservasi ${newBooking.booking_code} berhasil dibuat! Membuka Midtrans...`);

      // 3. Trigger Midtrans Snap Checkout
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
      const errData = err.response?.data;
      const msg = errData?.message || err.message || '';
      const isOverbooked =
        err.response?.status === 409 ||
        errData?.error_code === 'ROOM_ALREADY_BOOKED' ||
        msg.includes('sudah dibooking orang lain') ||
        msg.includes('sudah tidak tersedia') ||
        msg.includes('penuh');

      if (isOverbooked) {
        setIsOverbookedModalOpen(true);
        if (roomType?.id) {
          calculatePrice(roomType.id, checkIn, checkOut, appliedCoupon?.code);
        }
      } else {
        toast.error(msg || 'Terjadi kesalahan saat memproses booking.');
      }
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

  // Safe pricing metrics
  const basePricePerNight = Number(roomType?.base_price_per_night) || 0;
  const nights = Number(priceCalculation?.nights) || Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))) || 1;

  // The API returns the room cost as room_cost.total_amount (it already includes weekend prices)
  const roomCost = Number(priceCalculation?.room_cost?.total_amount ?? (basePricePerNight * nights)) || 0;
  const maxAdults = Number(roomType?.max_adults) || 4;
  const maxChildren = Number(roomType?.max_children ?? 2);
  const extrasTotal = Number(priceCalculation?.extras_total ?? 0) || 0;
  const subtotal = Number(priceCalculation?.subtotal ?? (roomCost + extrasTotal)) || 0;
  const discountAmount = Number(priceCalculation?.discount_amount ?? appliedCoupon?.discount_amount ?? 0) || 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAndService = Number(priceCalculation?.tax_and_service ?? Math.round(taxableAmount * 0.10)) || 0;
  const grandTotal = Number(priceCalculation?.grand_total ?? (taxableAmount + taxAndService)) || 0;

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

      {isStaff && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-3">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Akun staf tidak dapat memesan kamar.</p>
            <p className="mt-0.5">
              Hanya akun tamu (customer) yang bisa melakukan reservasi. Keluar dan masuk dengan akun tamu untuk memesan,
              atau kembali ke{' '}
              <Link to="/admin/dashboard" className="font-bold underline">
                dashboard admin
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Booking Form & Add-ons */}
        <div className="lg:col-span-2 space-y-8">
          {/* Room Header Card (Section 11: blur & overlay label saat kamar tidak tersedia) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row gap-6 items-center">
            <div className="relative w-full sm:w-44 h-36 rounded-2xl overflow-hidden bg-slate-900 shadow-sm shrink-0">
              <RoomImage
                src={roomType.image_url || roomType.featured_image}
                alt={roomType.name}
                className={`w-full h-full object-cover transition duration-300 ${
                  priceCalculation && !priceCalculation.is_available
                    ? 'filter blur-[2px] opacity-75'
                    : ''
                }`}
              />
              {priceCalculation && !priceCalculation.is_available && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-2 text-center">
                  <span className="px-3 py-1 bg-rose-600/95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg border border-rose-400/40">
                    Tidak Tersedia
                  </span>
                </div>
              )}
            </div>
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
                  👥 Max {formatRoomCapacity(roomType)}
                </span>
                <span className="bg-slate-100 px-3 py-1 rounded-lg font-semibold">
                  📐 {formatRoomSize(roomType)}
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
                    {Array.from({ length: maxAdults }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} Orang
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Maksimal {maxAdults} dewasa untuk kamar ini</p>
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
                    {Array.from({ length: maxChildren + 1 }, (_, i) => (
                      <option key={i} value={i}>
                        {i} Anak
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {maxChildren > 0 ? `Maksimal ${maxChildren} anak untuk kamar ini` : 'Kamar ini tidak menerima anak-anak'}
                  </p>
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
                        <span className="font-bold">Mohon maaf kamar sudah dibooking orang lain dan sudah tidak tersedia</span>
                        <span className="block text-[11px] text-rose-700">
                          Kamar tipe ini sudah terisi penuh pada rentang tanggal yang dipilih. Silakan ubah tanggal atau pilih tipe kamar lain.
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
                    placeholder="Contoh: Permintaan lantai atas, ranjang bayi (baby cot), atau early check-in jika memungkinkan."
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

            {/* Promo / Discount Coupon Section */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <TicketPercent className="w-4 h-4 text-amber-600" />
                <span>Punya Kode Promo / Kupon Diskon?</span>
              </label>

              {!appliedCoupon ? (
                <div className="space-y-2.5">
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={couponCodeInput}
                        onChange={(e) => {
                          setCouponCodeInput(e.target.value.toUpperCase());
                          if (couponError) setCouponError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                        placeholder="Contoh: ROYALVIP"
                        className="w-full pl-8 pr-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={couponLoading || !couponCodeInput.trim()}
                      onClick={() => handleApplyCoupon()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      {couponLoading ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>Terapkan</span>
                      )}
                    </button>
                  </div>

                  {couponError && (
                    <div className="text-[11px] text-rose-600 flex items-center space-x-1 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{couponError}</span>
                    </div>
                  )}

                  {/* Available coupon chips */}
                  {availableCoupons.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                        Kupon Tersedia (Klik untuk Pakai):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {availableCoupons.map((cp) => (
                          <button
                            key={cp.id}
                            type="button"
                            onClick={() => handleApplyCoupon(cp.code)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/70 rounded-lg text-[10px] font-bold transition flex items-center space-x-1"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                            <span>{cp.code}</span>
                            <span className="text-amber-600 font-normal">
                              ({cp.type === 'percentage' ? `${Math.round(cp.value)}%` : formatRupiah(cp.value)})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Applied Coupon Badge */
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-black text-emerald-900 tracking-wide">
                          {appliedCoupon.code}
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                          Aktif
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium">
                        {appliedCoupon.name || 'Diskon kupon promo'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus kupon"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Cost Details */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Biaya Kamar ({nights} malam):</span>
                <span className="font-bold text-slate-900">{formatRupiah(roomCost)}</span>
              </div>

              {extrasTotal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Layanan Tambahan:</span>
                  <span className="font-bold text-slate-900">{formatRupiah(extrasTotal)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-900">{formatRupiah(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200/80">
                  <span className="flex items-center space-x-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Diskon Promo ({appliedCoupon?.code || priceCalculation?.discount_code}):</span>
                  </span>
                  <span>-{formatRupiah(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Pajak & Layanan Hotel (10%):</span>
                <span className="font-bold text-slate-900">{formatRupiah(taxAndService)}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                    Total Pembayaran
                  </span>
                  <span className="text-[10px] text-slate-400">Termasuk pajak 10%</span>
                </div>
                <div className="text-right">
                  {discountAmount > 0 && (
                    <span className="text-xs text-slate-400 line-through block font-medium">
                      {formatRupiah(subtotal + Math.round(subtotal * 0.1))}
                    </span>
                  )}
                  <span className="text-2xl font-black text-amber-700">
                    {formatRupiah(grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Selector (Midtrans Online vs Cash at Hotel) */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">Pilih Metode Pembayaran *</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                  2 Opsi
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Option 1: Midtrans Snap Online */}
                <div
                  onClick={() => setPaymentMethod('midtrans')}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'midtrans'
                      ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                        <span>Bayar Online (Midtrans)</span>
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.2 rounded">
                          INSTAN
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Scan QRIS, BCA/Mandiri VA, GoPay, ShopeePay
                      </div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment_method_radio"
                    checked={paymentMethod === 'midtrans'}
                    onChange={() => setPaymentMethod('midtrans')}
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                  />
                </div>

                {/* Option 2: Cash on Arrival */}
                <div
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    paymentMethod === 'cash'
                      ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                        <span>Bayar di Tempat</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded">
                          FRONT DESK
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Bayar langsung di meja resepsionis saat Check-In
                      </div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment_method_radio"
                    checked={paymentMethod === 'cash'}
                    onChange={() => setPaymentMethod('cash')}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Guarantee / Payment Info Box */}
            {paymentMethod === 'midtrans' ? (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold">
                  <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                  <span>Midtrans Snap Instant Payment</span>
                </div>
                <p className="text-[10px] text-amber-800 leading-relaxed">
                  Kamar langsung dikunci 15 menit. Anda dapat membayar langsung dengan scan QRIS Gopay, BCA, Mandiri, ShopeePay atau Virtual Account.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold">
                  <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Bayar di Tempat saat Check-In</span>
                </div>
                <p className="text-[10px] text-emerald-800 leading-relaxed">
                  Reservasi Anda akan langsung dikonfirmasi. Anda cukup menunjukkan Kode Booking dan membayar langsung di meja Front Desk saat tiba di resort.
                </p>
              </div>
            )}

            {/* Checkout Action Button */}
            <button
              type="submit"
              form="hotel-booking-form"
              disabled={submitting || isStaff || (priceCalculation && !priceCalculation.is_available)}
              className={`w-full py-4 px-6 text-white font-black rounded-2xl shadow-lg transition transform hover:-translate-y-0.5 text-xs flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                paymentMethod === 'cash'
                  ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-emerald-600/30'
                  : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-amber-600/30'
              }`}
            >
              {submitting ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
              ) : isStaff ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Hanya Akun Tamu yang Dapat Memesan</span>
                </>
              ) : (priceCalculation && !priceCalculation.is_available) ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Kamar Penuh (Tidak Tersedia)</span>
                </>
              ) : paymentMethod === 'cash' ? (
                <>
                  <Banknote className="w-4 h-4" />
                  <span>Konfirmasi Reservasi & Bayar di Tempat</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Bayar Sekarang via Midtrans</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Notifikasi Jika Kamar Sudah Dibooking Orang Lain (Double-Booking Conflict) */}
      {isOverbookedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-rose-100 text-center space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mx-auto shadow-inner">
              <AlertCircle className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">
                Kamar Sudah Tidak Tersedia
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium leading-relaxed">
                Mohon maaf kamar sudah dibooking orang lain dan sudah tidak tersedia pada rentang tanggal yang Anda pilih.
              </p>

              <div className="mt-3 p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-left text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center space-x-1.5">
                  <span>💡</span>
                  <span>Informasi Ketersediaan:</span>
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Tamu lain baru saja menyelesaikan pembayaran beberapa detik lebih awal untuk sisa kuota unit kamar ini. Anda dapat memilih tipe kamar mewah lainnya atau mengatur ulang tanggal menginap.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => navigate('/services')}
                className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-md transition text-xs flex items-center justify-center space-x-1.5"
              >
                <span>Lihat Kamar & Suite Lainnya</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOverbookedModalOpen(false);
                  const el = document.getElementById('checkInInput');
                  if (el) el.focus();
                }}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs"
              >
                Ubah Tanggal Menginap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
