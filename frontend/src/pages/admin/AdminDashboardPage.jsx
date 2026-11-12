import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { formatRupiah, formatDateTime, formatDate, BOOKING_STATUS_CONFIG } from '../../utils/format';
import {
  Users,
  CreditCard,
  DoorOpen,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Hotel,
  BedDouble,
  LogOut,
  LogIn,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export default function AdminDashboardPage() {
  const { isSuperAdmin } = useAuth(); // front desk does not see revenue (the API also omits it)
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await adminService.getDashboard();
        if (res.data) setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-600 border-t-transparent mx-auto"></div>
        <p className="text-slate-400 text-xs mt-3">Memuat statistik operasional resort...</p>
      </div>
    );
  }

  const {
    occupancy_rate = 0,
    total_rooms = 0,
    occupied_rooms = 0,
    total_customers = 0,
    total_revenue = 0,
    expected_arrivals_today = 0,
    expected_departures_today = 0,
    currently_checked_in = 0,
    status_breakdown = {},
    room_statuses = {},
    revenue_trend = [],
    recent_bookings = [],
    recent_payments = [],
  } = data || {};

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-8 rounded-3xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold backdrop-blur-sm">
            <Hotel className="w-3.5 h-3.5" />
            <span>The Royal Nusantara Resort & Luxury Suites</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Front Desk & Hotel Overview</h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            Monitoring okupansi kamar, kedatangan & keberangkatan tamu hari ini
            {isSuperAdmin ? ', serta pendapatan Midtrans.' : '.'}
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <Link
            to="/admin/bookings"
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            Check-In Tamu
          </Link>
          <Link
            to="/admin/rooms"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700"
          >
            Status Kamar
          </Link>
        </div>
      </div>

      {/* Hotel Front Desk Key Metrics */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${
          isSuperAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        }`}
      >
        {/* Occupancy Rate */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Tingkat Okupansi
            </span>
            <p className="text-3xl font-black text-amber-700 mt-1">{occupancy_rate}%</p>
            <span className="text-xs text-slate-500 font-semibold mt-1 block">
              {occupied_rooms} dari {total_rooms} kamar terisi
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Hotel className="w-6 h-6" />
          </div>
        </div>

        {/* Arrivals Today */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Kedatangan Hari Ini
            </span>
            <p className="text-3xl font-black text-emerald-600 mt-1">{expected_arrivals_today}</p>
            <span className="text-xs text-slate-500 font-semibold mt-1 block">
              Tamu terkonfirmasi siap check-in
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <LogIn className="w-6 h-6" />
          </div>
        </div>

        {/* Departures Today */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Keberangkatan Hari Ini
            </span>
            <p className="text-3xl font-black text-rose-600 mt-1">{expected_departures_today}</p>
            <span className="text-xs text-slate-500 font-semibold mt-1 block">
              Jadwal check-out (12:00)
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <LogOut className="w-6 h-6" />
          </div>
        </div>

        {/* Total Revenue (super admin only) */}
        {isSuperAdmin && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Revenue Lunas
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {formatRupiah(total_revenue)}
              </p>
              <span className="text-xs text-slate-500 font-semibold mt-1 block">
                Pembayaran Midtrans & QRIS
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        )}
      </div>

      {/* Housekeeping & Room Status Distribution */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-black text-slate-900 text-sm">Status Inventaris Kamar (Housekeeping)</h3>
            <p className="text-xs text-slate-400">Kondisi seluruh unit fisik saat ini</p>
          </div>
          <Link to="/admin/rooms" className="text-xs font-bold text-amber-700 hover:underline">
            Kelola Inventaris Kamar →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-800 uppercase block">Kamar Tersedia</span>
            <span className="text-2xl font-black text-emerald-900 mt-1 block">
              {room_statuses.available || 0}
            </span>
            <span className="text-[10px] text-emerald-700">Bersih & siap diisi</span>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
            <span className="text-[11px] font-bold text-blue-800 uppercase block">Terisi (Occupied)</span>
            <span className="text-2xl font-black text-blue-900 mt-1 block">
              {room_statuses.occupied || 0}
            </span>
            <span className="text-[10px] text-blue-700">Tamu sedang menginap</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="text-[11px] font-bold text-amber-800 uppercase block">Pembersihan (Cleaning)</span>
            <span className="text-2xl font-black text-amber-900 mt-1 block">
              {room_statuses.cleaning || 0}
            </span>
            <span className="text-[10px] text-amber-700">Housekeeping bertugas</span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
            <span className="text-[11px] font-bold text-rose-800 uppercase block">Maintenance</span>
            <span className="text-2xl font-black text-rose-900 mt-1 block">
              {room_statuses.maintenance || 0}
            </span>
            <span className="text-[10px] text-rose-700">Perbaikan fasilitas</span>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart & Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart (super admin only) */}
        {isSuperAdmin && (
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-sm">Tren Pendapatan 7 Hari Terakhir</h3>
              <p className="text-xs text-slate-400">Total nilai transaksi kamar & add-on terverifikasi lunas</p>
            </div>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue_trend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(1)}jt`}
                />
                <Tooltip
                  formatter={(val) => [formatRupiah(val), 'Pendapatan']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

        {/* Recent Bookings List */}
        <div
          className={`bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between ${
            isSuperAdmin ? '' : 'lg:col-span-3'
          }`}
        >
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-slate-900 text-sm">Reservasi Terbaru</h3>
              <Link to="/admin/bookings" className="text-xs text-amber-700 font-bold hover:underline">
                Lihat Semua
              </Link>
            </div>

            <div className="space-y-3">
              {recent_bookings.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Belum ada reservasi masuk.</p>
              ) : (
                recent_bookings.map((b) => {
                  const cfg = BOOKING_STATUS_CONFIG[b.status] || BOOKING_STATUS_CONFIG.PENDING_PAYMENT;
                  return (
                    <div
                      key={b.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {b.room_type?.name || 'Luxury Suite'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {b.customer_name} • {formatDate(b.check_in_date)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                        <div className="text-[11px] font-bold text-slate-900 mt-1">
                          {formatRupiah(b.total_amount)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <Link
            to="/admin/bookings"
            className="w-full mt-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold text-center block transition"
          >
            Buka Front Desk PMS
          </Link>
        </div>
      </div>
    </div>
  );
}
