import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { formatDate } from '../../utils/format';
import { Users, Search, Mail, Phone, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

// Guest book: read-only list of registered guests. There are no create, edit or delete actions here.
export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ last_page: 1, total: 0 });

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const res = await adminService.getCustomers({ search: appliedSearch, page });
        if (res.data?.data) {
          setCustomers(res.data.data);
          setMeta({
            last_page: res.data.last_page || 1,
            total: res.data.total ?? res.data.data.length,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [appliedSearch, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const isSearching = appliedSearch !== '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Buku Tamu</h1>
          <p className="text-sm text-slate-500 mt-1">
            Daftar tamu terdaftar (hanya lihat). Cari nama, email, atau nomor HP untuk mengecek apakah seseorang sudah
            terdaftar.
          </p>
        </div>

        <form onSubmit={handleSearch} className="relative min-w-[280px]">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, email, nomor HP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </form>
      </div>

      {/* Registered check result */}
      {isSearching && !loading && (
        meta.total > 0 ? (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>Terdaftar:</strong> {meta.total} tamu cocok dengan &quot;{appliedSearch}&quot;.
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Tidak ditemukan:</strong> &quot;{appliedSearch}&quot; belum terdaftar sebagai tamu.
            </span>
          </div>
        )
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Memuat daftar tamu...</div>
        ) : customers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            Tidak ada tamu yang ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Nama</th>
                  <th className="px-6 py-3.5 text-left">Email</th>
                  <th className="px-6 py-3.5 text-left">Nomor Telepon</th>
                  <th className="px-6 py-3.5 text-left">Total Reservasi</th>
                  <th className="px-6 py-3.5 text-left">Tgl Bergabung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">{c.name}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      <span className="flex items-center space-x-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.email}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      <span className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.phone || '-'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                        {c.bookings_count || 0} booking
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap text-xs">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Halaman {page} dari {meta.last_page} ({meta.total} tamu)
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>
            <button
              type="button"
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
