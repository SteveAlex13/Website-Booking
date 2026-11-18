import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { serviceService } from '../../services/serviceService';
import { formatRupiah, formatRoomCapacity, formatRoomSize } from '../../utils/format';
import RoomImage from '../../components/common/RoomImage';
import {
  Hotel,
  Calendar,
  Users,
  Star,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Coffee,
  Waves,
  Wifi,
  Tv,
  Car,
  Utensils,
  Award,
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [extraServices, setExtraServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search Bar State
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hotelRes, roomRes, extrasRes] = await Promise.all([
          serviceService.getHotel(),
          serviceService.getRoomTypes({
            check_in: checkIn,
            check_out: checkOut,
            adults,
            children,
          }),
          serviceService.getExtraServices(),
        ]);
        if (hotelRes.data) setHotel(hotelRes.data);
        if (roomRes.data) {
          const typesList = Array.isArray(roomRes.data)
            ? roomRes.data
            : roomRes.data?.room_types || roomRes.data?.data || [];
          setRoomTypes(typesList);
        }
        if (extrasRes.data) {
          const extrasList = Array.isArray(extrasRes.data)
            ? extrasRes.data
            : extrasRes.data?.data || [];
          setExtraServices(extrasList);
        }
      } catch (err) {
        console.error('Error fetching hotel data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(
      `/services?check_in=${checkIn}&check_out=${checkOut}&adults=${adults}&children=${children}`
    );
  };

  const safeRoomTypes = Array.isArray(roomTypes)
    ? roomTypes
    : roomTypes?.room_types || roomTypes?.data || [];

  return (
    <div className="space-y-20 pb-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950 text-white pt-16 pb-32">
        {/* Background glow overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-5">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Satu-satunya Luxury 5-Star Beachfront Resort di Nusa Dua</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-white">
              Ketenangan Sempurna & Kemewahan Tak Tertandingi
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
              {hotel?.description ||
                'Nikmati pengalaman menginap berkelas dunia dengan panorama samudera lepas, layanan butler privat 24 jam, dan suite arsitektur nusantara modern.'}
            </p>

            {/* Quick Badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-amber-200/90 pt-2">
              <span className="flex items-center space-x-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold">5.0 Star Resort</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Garansi Ketersediaan Real-Time</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>Instant QRIS Midtrans</span>
              </span>
            </div>
          </div>

          {/* Hotel Booking Search Bar Card */}
          <div className="mt-12 max-w-5xl mx-auto bg-white rounded-3xl p-6 sm:p-8 text-slate-800 shadow-2xl border border-slate-100">
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  Check-In
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-amber-600 absolute left-3.5 top-3.5 pointer-events-none" />
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
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  Check-Out
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-amber-600 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="date"
                    min={checkIn}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  Jumlah Tamu
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-amber-600 absolute left-3.5 top-3.5 pointer-events-none" />
                  <select
                    value={`${adults}-${children}`}
                    onChange={(e) => {
                      const [a, c] = e.target.value.split('-').map(Number);
                      setAdults(a);
                      setChildren(c);
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                  >
                    <option value="1-0">1 Dewasa</option>
                    <option value="2-0">2 Dewasa</option>
                    <option value="2-1">2 Dewasa, 1 Anak</option>
                    <option value="2-2">2 Dewasa, 2 Anak</option>
                    <option value="3-0">3 Dewasa</option>
                    <option value="4-2">4 Dewasa, 2 Anak (Suite / Villa)</option>
                  </select>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black rounded-2xl shadow-lg shadow-amber-600/30 transition transform hover:-translate-y-0.5 text-xs flex items-center justify-center space-x-2"
                >
                  <span>Cari Ketersediaan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Hotel Highlights / Value Proposition */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Waves className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Beachfront & Private Pool</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Akses langsung ke pasir putih Nusa Dua dan kolam renang infinity dengan pemandangan matahari terbenam.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Kuliner Nusantara & Dunia</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Restoran bintang 5 dengan santapan otentik Bali, sarapan apung privat (floating breakfast), dan rooftop lounge.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Pasti Bebas Double-Booking</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Mesin ketersediaan dengan date-range overlap lock mengunci kamar pilihan Anda seketika saat reservasi.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Layanan Butler 24 Jam</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Tim concierge profesional siap memenuhi segala preferensi Anda mulai dari penjemputan Alphard hingga tur privat.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Suites & Rooms Catalog */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">
              Koleksi Kamar & Suite
            </span>
            <h2 className="text-3xl font-black text-slate-900 mt-1">Pilihan Ruang Menginap Eksklusif</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              Setiap kamar dirancang dengan interior kayu jati mewah, balkon privat, linen katun Mesir 400-thread, dan teknologi mutakhir.
            </p>
          </div>
          <Link
            to="/services"
            className="inline-flex items-center space-x-2 text-xs font-bold text-amber-700 hover:text-amber-800 self-start sm:self-auto group"
          >
            <span>Lihat Semua Tipe ({safeRoomTypes.length})</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </Link>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent mx-auto mb-2"></div>
            Memuat katalog kamar...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {safeRoomTypes.slice(0, 3).map((room) => {
              const availableSlots = room.available_slots !== undefined 
                ? room.available_slots 
                : (room.available_count !== undefined 
                  ? room.available_count 
                  : (room.available_rooms_count !== undefined 
                    ? room.available_rooms_count 
                    : (room.is_available === false ? 0 : 1)));
              const isAvailable = availableSlots > 0 && room.is_available !== false;

              return (
              <div
                key={room.id}
                className={`room-card bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group ${
                  !isAvailable ? 'is-unavailable' : ''
                }`}
              >
                {/* Image / Banner (Section 11: blur & label saat tidak tersedia) */}
                <div className="room-photo-wrap relative h-56 bg-slate-900 overflow-hidden">
                  <RoomImage
                    src={room.image_url || room.featured_image}
                    alt={room.name}
                    className={`room-photo w-full h-full object-cover transition duration-500 ${
                      !isAvailable ? 'filter blur-[2px] opacity-75' : 'group-hover:scale-105'
                    }`}
                  />

                  {/* Section 11: Overlay Label Tidak Tersedia */}
                  {!isAvailable && (
                    <div className="availability-label absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
                      <span className="px-3.5 py-1.5 bg-rose-600/95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl border border-rose-400/40">
                        Tidak Tersedia
                      </span>
                    </div>
                  )}

                  <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center space-x-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>Luxury Suite</span>
                  </div>
                  <div className="absolute bottom-4 right-4 bg-amber-500/90 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                    {formatRoomSize(room)}
                  </div>
                </div>

                {/* Details */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-amber-600 transition">
                        {room.name}
                      </h3>
                      {!isAvailable && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          Penuh
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {room.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-600">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg font-medium">
                        🛏️ {room.bed_type}
                      </span>
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg font-medium">
                        👥 Max {formatRoomCapacity(room)}
                      </span>
                    </div>

                    {/* Amenities Icons */}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {room.amenities.slice(0, 4).map((amenity) => (
                          <span
                            key={amenity.id}
                            className="text-[10px] bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded-md"
                          >
                            ✓ {amenity.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Price and CTA */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                        Mulai dari
                      </span>
                      <span className="text-lg font-black text-slate-900">
                        {formatRupiah(room.base_price_per_night)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold"> / malam</span>
                    </div>

                    {isAvailable ? (
                      <Link
                        to={`/book/${room.id}?check_in=${checkIn}&check_out=${checkOut}&adults=${adults}&children=${children}`}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition"
                      >
                        Pesan Suite
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2.5 bg-slate-200 text-slate-500 text-xs font-bold rounded-xl cursor-not-allowed opacity-60"
                        title="Mohon maaf kamar sudah dibooking orang lain dan sudah tidak tersedia"
                      >
                        Kamar Penuh
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </section>

      {/* Extra Services & Experiences */}
      {extraServices.length > 0 && (
        <section className="bg-amber-50/50 py-16 border-y border-amber-100/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">
                Pengalaman Eksklusif
              </span>
              <h2 className="text-3xl font-black text-slate-900">Layanan Tambahan Mewah</h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Lengkapi liburan Anda dengan add-on premium yang dapat langsung Anda pilih saat booking.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {extraServices.map((extra) => (
                <div
                  key={extra.id}
                  className="bg-white p-6 rounded-2xl border border-amber-200/60 shadow-sm flex items-start space-x-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 font-bold">
                    <Coffee className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{extra.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{extra.description}</p>
                    <span className="text-xs font-black text-amber-700 mt-2 block">
                      +{formatRupiah(extra.price)} ({extra.price_type === 'per_stay' ? 'per masa inap' : 'per malam'})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Guest Reviews & Hospitality Assurance */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="flex text-amber-400 space-x-1">
              <Star className="w-5 h-5 fill-amber-400" />
              <Star className="w-5 h-5 fill-amber-400" />
              <Star className="w-5 h-5 fill-amber-400" />
              <Star className="w-5 h-5 fill-amber-400" />
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black">
              "Pengalaman menginap paling berkesan dan mewah di Bali."
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Proses reservasi sangat cepat dan nyaman. Langsung scan QRIS dari layar ponsel, konfirmasi kamar seketika, dan saat tiba kamar sudah dipersiapkan dengan wangi aromaterapi khas Bali.
            </p>
            <div className="pt-2 text-xs font-semibold text-amber-300">
              — Budi Santoso, Jakarta (Tamu Presidential Suite)
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <Link
              to="/services"
              className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl shadow-lg transition text-center text-xs"
            >
              Cek Semua Kamar Tersedia
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
