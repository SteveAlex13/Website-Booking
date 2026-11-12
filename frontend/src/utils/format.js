// "2 Dewasa, 1 Anak" from a room type (API fields: max_adults, max_children)
export function formatRoomCapacity(room) {
  const adults = room?.max_adults ?? room?.max_occupancy;
  const children = Number(room?.max_children) || 0;
  if (!adults) return '-';
  return children > 0 ? `${adults} Dewasa, ${children} Anak` : `${adults} Dewasa`;
}

// "38 m²" from a room type (API field: room_size_sqm)
export function formatRoomSize(room) {
  const size = room?.room_size_sqm ?? room?.size_sqm;
  return size ? `${size} m²` : '-';
}

export function formatRupiah(amount) {
  if (amount === undefined || amount === null || amount === '') return 'Rp 0';
  const num = Number(amount);
  if (Number.isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatTime(timeString) {
  if (!timeString) return '-';
  if (timeString.includes('T')) {
    const d = new Date(timeString);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  return timeString.substring(0, 5);
}

export const BOOKING_STATUS_CONFIG = {
  PENDING_PAYMENT: {
    label: 'Menunggu Pembayaran',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  CONFIRMED: {
    label: 'Terkonfirmasi',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  CHECKED_IN: {
    label: 'Checked In',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
  CHECKED_OUT: {
    label: 'Checked Out',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
  },
  COMPLETED: {
    label: 'Selesai',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  CANCELLED: {
    label: 'Dibatalkan',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  EXPIRED: {
    label: 'Kedaluwarsa',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-300',
  },
  NO_SHOW: {
    label: 'No Show',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-300',
  },
  PAID_NO_SLOT: {
    label: 'Kamar Penuh (Perlu Refund)',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
};

export const PAYMENT_STATUS_CONFIG = {
  PENDING: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700' },
  PAID: { label: 'Lunas', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  FAILED: { label: 'Gagal', bg: 'bg-rose-50', text: 'text-rose-700' },
  EXPIRED: { label: 'Kedaluwarsa', bg: 'bg-slate-100', text: 'text-slate-600' },
  CANCELLED: { label: 'Dibatalkan', bg: 'bg-rose-50', text: 'text-rose-700' },
  REFUNDED: { label: 'Refund', bg: 'bg-purple-50', text: 'text-purple-700' },
  PAID_NO_SLOT: { label: 'Perlu Refund', bg: 'bg-orange-50', text: 'text-orange-700' },
  REFUND_PENDING: { label: 'Menunggu Refund', bg: 'bg-orange-50', text: 'text-orange-700' },
};
