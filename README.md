# The Royal Nusantara - Hotel & Resort Management System

Aplikasi sistem manajemen reservasi hotel, kamar, dan kasir front desk berbasis web yang dibangun dengan arsitektur modern: **Laravel 12 (PHP 8.4)** sebagai RESTful API backend, **React.js + Vite + Tailwind CSS** sebagai responsive frontend, **MySQL 8** dengan InnoDB atomicity, serta **Midtrans Snap** sebagai payment gateway.

> 📜 **Riwayat Pembaruan & Fitur Baru:** Seluruh log pembaruan dan fitur yang telah ditambahkan dapat dilihat lengkap di file [**`CHANGELOG.md`**](file:///c:/laragon/www/laravel-booking/CHANGELOG.md).

---

## 📌 Fitur Utama

- **Katalog Layanan & Kategori:** Pengelolaan dinamis layanan, tarif, durasi, foto, dan kapasitas sesi.
- **Ketersediaan Jadwal Real-Time:** Menghitung slot waktu berdasarkan jam operasional harian dan pengecualian libur khusus.
- **Pencegahan Double-Booking (Concurrency Safe):** Menggunakan transaksi database InnoDB dengan `SELECT ... FOR UPDATE` (`lockForUpdate()`) untuk memastikan kapasitas slot tidak pernah overbooked.
- **Midtrans Snap Integration:** Pembuatan Snap Token dari backend, checkout multi-metode (QRIS, GoPay, ShopeePay, Virtual Account Bank), dan verifikasi webhook berbasis SHA-512 signature.
- **Idempotent Webhook & Capacity Release:** Penanganan notifikasi pembayaran idempotensi tinggi, otomatis mengubah booking menjadi `CONFIRMED` saat pembayaran lunas, atau melepas kapasitas slot satu kali jika `CANCELLED`/`EXPIRED`.
- **Customer Dashboard:** Riwayat booking, pemantauan status real-time, aksi bayar langsung, pembatalan mandiri untuk booking belum dibayar, serta pengelolaan profil.
- **Admin Management Panel:** Dashboard analitik grafik tren pendapatan 7 hari, kelola kategori & layanan, atur jam kerja & libur khusus, generator slot massal, kelola status reservasi, dan laporan rekapitulasi.

---

## 🛠️ Tech Stack

| Komponen | Teknologi |
|---|---|
| **Backend** | Laravel 12 (PHP 8.4) |
| **Frontend** | React 19, Vite, Tailwind CSS, Lucide React, Recharts |
| **Database** | MySQL 8.0 (InnoDB Engine) |
| **Authentication** | Laravel Sanctum (Bearer Token) |
| **Payment Gateway** | Midtrans Snap (PHP SDK & Snap JS) |
| **HTTP Client** | Axios (dengan Auth Interceptor) |
| **Task Scheduling** | Laravel Console Scheduler (`bookings:expire-pending`) |

---

## 📋 Akun Default Pengujian (Seeder)

Setelah menjalankan seeder database, akun berikut siap digunakan:

| Role | Email | Password | Akses |
|---|---|---|---|
| **Super Admin** | `admin@booking.com` | `password123` | Akses penuh dashboard admin & konfigurasi |
| **Staff Admin** | `staff@booking.com` | `password123` | Akses operasional admin |
| **Customer** | `customer@booking.com` | `password123` | Akses customer & pemesanan layanan |

*(Atau dapat mendaftar akun baru melalui halaman Registrasi)*

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### 1. Prasyarat Sistem
- PHP >= 8.2 (disarankan PHP 8.4)
- Composer >= 2.0
- Node.js >= 18
- MySQL >= 8.0 (Laragon / XAMPP / Native MySQL)

---

### 2. Konfigurasi Backend (Laravel)

1. Masuk ke direktori `backend`:
   ```bash
   cd backend
   ```

2. Salin environment file:
   ```bash
   cp .env.example .env
   ```

3. Sesuaikan konfigurasi database dan Midtrans di `.env`:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=laravel_booking
   DB_USERNAME=root
   DB_PASSWORD=

   MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx
   MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxx
   MIDTRANS_IS_PRODUCTION=false
   BOOKING_EXPIRATION_MINUTES=15
   ```

4. Jalankan migration dan seeder (kategori, layanan awal, jam operasional, dan slot jadwal otomatis):
   ```bash
   php artisan migrate:fresh --seed
   ```

5. Hubungkan storage symlink untuk upload foto:
   ```bash
   php artisan storage:link
   ```

6. Jalankan server Laravel backend (port 8000):
   ```bash
   php artisan serve --port=8000
   ```

---

### 3. Konfigurasi Frontend (React + Vite)

1. Buka terminal baru dan masuk ke direktori `frontend`:
   ```bash
   cd frontend
   ```

2. Instal dependensi:
   ```bash
   npm install
   ```

3. Jalankan server development Vite (port 5173):
   ```bash
   npm run dev
   ```

4. Buka browser pada alamat:
   ```
   http://localhost:5173
   ```

---

### 4. Menjalankan Otomatisasi (Scheduler & Queue)

Untuk memproses booking yang kedaluwarsa (melebihi 15 menit tanpa pembayaran) secara otomatis:
```bash
cd backend
php artisan bookings:expire-pending
```
Atau jalankan Laravel schedule runner:
```bash
php artisan schedule:work
```

---

## 🧪 Menjalankan Automated Testing

Backend dilengkapi dengan pengujian PHPUnit untuk alur kritis:
- Autentikasi dan Role Authorization
- Pencegahan Double Booking & Penguncian Kapasitas Database (`lockForUpdate`)
- Pelepasan Kapasitas saat Booking Expired
- Verifikasi Signature & Idempotensi Webhook Midtrans

Jalankan test:
```bash
cd backend
php artisan test
```

---

## 📑 Ringkasan Endpoint REST API (`/api/v1`)

### Autentikasi & Publik
- `POST /api/v1/register` – Registrasi pelanggan
- `POST /api/v1/login` – Login (mendapatkan token Sanctum)
- `POST /api/v1/logout` – Logout
- `GET /api/v1/user` – Profil pengguna login
- `PUT /api/v1/user/profile` – Update profil
- `GET /api/v1/categories` – Daftar kategori layanan aktif
- `GET /api/v1/services` – Daftar katalog layanan
- `GET /api/v1/services/{id}` – Detail layanan
- `GET /api/v1/services/{id}/availability?date=YYYY-MM-DD` – Cek slot jadwal tersedia

### Pelanggan
- `POST /api/v1/bookings` – Membuat reservasi booking baru
- `GET /api/v1/bookings` – Riwayat booking milik pelanggan
- `GET /api/v1/bookings/{id}` – Detail booking
- `POST /api/v1/bookings/{id}/cancel` – Batalkan booking pending

### Pembayaran
- `POST /api/v1/payments/checkout` – Request Snap Token Midtrans
- `GET /api/v1/payments/{id}` – Detail status pembayaran
- `GET /api/v1/payments/{id}/status` – Rekonsiliasi status ke Midtrans API
- `POST /api/v1/webhooks/midtrans` – Webhook HTTP Notification dari Midtrans

### Admin (`/api/v1/admin/*`)
- `GET /api/v1/admin/dashboard` – Statistik dan grafik analitik
- `GET /api/v1/admin/reports` – Laporan pendapatan dan ranking layanan
- `GET|POST|PUT|DELETE /api/v1/admin/categories` – CRUD Kategori
- `GET|POST|PUT|DELETE /api/v1/admin/services` – CRUD Layanan
- `GET|POST /api/v1/admin/business-hours` – Atur jam operasional
- `GET|POST|DELETE /api/v1/admin/schedule-exceptions` – Atur hari libur khusus
- `POST /api/v1/admin/booking-slots/generate` – Batch slot generator
- `GET /api/v1/admin/bookings` – Pantau seluruh booking
- `PATCH /api/v1/admin/bookings/{id}/status` – Ubah status booking manual
- `GET /api/v1/admin/customers` – Data pelanggan
- `GET /api/v1/admin/payments` – Data transaksi Midtrans

