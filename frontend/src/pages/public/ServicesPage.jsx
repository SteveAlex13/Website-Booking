import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { serviceService } from '../../services/serviceService';
import { formatRupiah, formatRoomCapacity, formatRoomSize } from '../../utils/format';
import RoomImage from '../../components/common/RoomImage';
import {
  Calendar,
  Users,
  Search,
  Filter,
  Star,
  Check,
  DoorOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState(searchParams.get('check_in') || today);
  const [checkOut, setCheckOut] = useState(searchParams.get('check_out') || tomorrow);
  const [adults, setAdults] = useState(Number(searchParams.get('adults') || 2));
  const [children, setChildren] = useState(Number(searchParams.get('children') || 0));
  const [bedTypeFilter, setBedTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calculate nights
  const nights = Math.max(
    1,
    Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const params = {
        // The public room-types endpoint expects these names so availability
        // is calculated for the dates selected by the customer.
        check_in: checkIn,
        check_out: checkOut,
        adults: adults,
        children: children,
      };
      if (bedTypeFilter) params.bed_type = bedTypeFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await serviceService.getRoomTypes(params);
      if (res.data) {
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.room_types || res.data?.data || [];
        setRoomTypes(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [checkIn, checkOut, adults, children, bedTypeFilter, searchTerm]);

  const safeRoomTypes = Array.isArray(roomTypes)
    ? roomTypes
    : roomTypes?.room_types || roomTypes?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">
            Koleksi Ruang Menginap
          </span>
          <h1 className="text-3xl font-black text-slate-900 mt-1">Daftar Kamar & Villa</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-2xl">
            Pilih dari kamar Deluxe bernuansa tropis hingga Presidential Villa privat tepi pantai dengan kolam renang pribadi.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-2xl text-xs text-amber-800 font-bold flex items-center space-x-2 self-start sm:self-auto">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>Durasi Menginap: {nights} Malam</span>
        </div>
      </div>

      {/* Date & Guest Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Check-In
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-amber-600 absolute left-3 top-3 pointer-events-none" />
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
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Check-Out
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-amber-600 absolute left-3 top-3 pointer-events-none" />
              <input
                type="date"
                min={checkIn}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Tamu (Dewasa & Anak)
            </label>
            <div className="relative">
              <Users className="w-4 h-4 text-amber-600 absolute left-3 top-3 pointer-events-none" />
              <select
                value={`${adults}-${children}`}
                onChange={(e) => {
                  const [a, c] = e.target.value.split('-').map(Number);
                  setAdults(a);
                  setChildren(c);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="1-0">1 Dewasa</option>
                <option value="2-0">2 Dewasa</option>
                <option value="2-1">2 Dewasa, 1 Anak</option>
                <option value="2-2">2 Dewasa, 2 Anak</option>
                <option value="3-0">3 Dewasa</option>
                <option value="4-2">4 Dewasa, 2 Anak</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Tipe Tempat Tidur
            </label>
            <select
              value={bedTypeFilter}
              onChange={(e) => setBedTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
            >
              <option value="">Semua Tipe Kasur</option>
              <option value="King Bed">King Bed</option>
              <option value="Twin Bed">Twin Bed</option>
              <option value="Queen Bed">Queen Bed</option>
              <option value="2 King Beds">2 King Beds</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Pencarian
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Nama tipe kamar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Room Types Listing */}
      {loading ? (
        <div className="py-24 text-center text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent mx-auto mb-2"></div>
          Memeriksa ketersediaan unit kamar...
        </div>
      ) : safeRoomTypes.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-4">
          <DoorOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">Tidak ada kamar tersedia</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Semua kamar pada rentang tanggal atau kapasitas ini telah terisi. Silakan ubah tanggal check-in/check-out Anda.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {safeRoomTypes.map((room) => {
            const availableSlots = room.available_slots !== undefined 
              ? room.available_slots 
              : (room.available_count !== undefined 
                ? room.available_count 
                : (room.available_rooms_count !== undefined 
                  ? room.available_rooms_count 
                  : (room.is_available === false ? 0 : 1)));
            const isAvailable = availableSlots > 0 && room.is_available !== false;
            const pricePerNight = Number(room.base_price_per_night) || 0;
            const estimatedTotal = pricePerNight * nights;

            return (
              <div
                key={room.id}
                className={`room-card bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-lg transition flex flex-col lg:flex-row group ${
                  !isAvailable ? 'is-unavailable' : ''
                }`}
              >
                {/* Room Image (Section 11: blur & overlay label saat tidak tersedia) */}
                <div className="room-photo-wrap lg:w-2/5 relative h-64 lg:h-auto bg-slate-900 overflow-hidden">
                  <RoomImage
                    src={room.image_url || room.featured_image}
                    alt={room.name}
                    className={`room-photo w-full h-full object-cover transition duration-500 ${
                      !isAvailable
                        ? 'filter blur-[2px] opacity-75'
                        : 'group-hover:scale-105'
                    }`}
                  />

                  {/* Section 11: Overlay Label Tidak Tersedia */}
                  {!isAvailable && (
                    <div className="availability-label absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
                      <span className="px-4 py-2 bg-rose-600/95 text-white font-black text-xs sm:text-sm uppercase tracking-widest rounded-2xl shadow-xl border border-rose-400/40">
                        Tidak Tersedia
                      </span>
                    </div>
                  )}

                  <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>5-Star Comfort</span>
                  </div>
                  <div className="absolute bottom-4 left-4 bg-white/95 text-slate-900 text-xs font-bold px-3 py-1 rounded-full shadow">
                    {formatRoomSize(room)}
                  </div>
                </div>

                {/* Room Content */}
                <div className="p-6 sm:p-8 lg:w-3/5 flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <h3 className="text-2xl font-black text-slate-900 group-hover:text-amber-600 transition">
                        {room.name}
                      </h3>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {isAvailable
                          ? `Tersedia ${availableSlots} Kamar`
                          : 'Penuh (Sold Out)'}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {room.description}
                    </p>

                    {/* Room Attributes */}
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-700">
                      <span className="bg-slate-100 px-3 py-1.5 rounded-xl font-semibold">
                        🛏️ {room.bed_type}
                      </span>
                      <span className="bg-slate-100 px-3 py-1.5 rounded-xl font-semibold">
                        👥 Max {formatRoomCapacity(room)}
                      </span>
                      <span className="bg-slate-100 px-3 py-1.5 rounded-xl font-semibold">
                        📐 {formatRoomSize(room)}
                      </span>
                    </div>

                    {/* Amenities Checklist */}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                        {room.amenities.map((amenity) => (
                          <span
                            key={amenity.id}
                            className="text-xs text-slate-600 bg-amber-50/70 border border-amber-200/50 px-2.5 py-1 rounded-lg flex items-center space-x-1"
                          >
                            <Check className="w-3 h-3 text-amber-600" />
                            <span>{amenity.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pricing and Book Button (Section 11: dinonaktifkan / Kamar penuh saat tidak tersedia) */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                      <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                        Harga Kamar / Malam
                      </div>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-black text-slate-900">
                          {formatRupiah(room.base_price_per_night)}
                        </span>
                        <span className="text-xs text-slate-400">/ malam</span>
                      </div>
                      {nights > 1 && (
                        <div className="text-xs font-semibold text-amber-700 mt-1">
                          Estimasi {nights} malam: {formatRupiah(estimatedTotal)} (belum termasuk tax/add-on)
                        </div>
                      )}
                    </div>

                    {isAvailable ? (
                      <Link
                        to={`/book/${room.id}?check_in=${checkIn}&check_out=${checkOut}&adults=${adults}&children=${children}`}
                        className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-2xl shadow-md shadow-amber-600/30 transition flex items-center justify-center space-x-2 self-stretch sm:self-auto"
                      >
                        <span>Pilih & Pesan Suite</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="px-6 py-3.5 bg-slate-200 text-slate-500 font-black text-xs rounded-2xl shadow-none transition flex items-center justify-center space-x-2 self-stretch sm:self-auto cursor-not-allowed opacity-60"
                        title="Mohon maaf kamar sudah dibooking orang lain dan sudah tidak tersedia"
                      >
                        <span>Kamar Penuh</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
