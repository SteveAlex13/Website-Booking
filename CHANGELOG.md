# 📜 Changelog & Riwayat Pembaruan Sistem
Semua pembaruan, penambahan fitur, perbaikan bug, dan optimasi pada sistem **The Royal Nusantara Hotel & Resort Management System** dicatat secara kronologis di dokumen ini.

---

## 🚀 [Unreleased / Versi Terbaru] — 23 November 2026

### 1. 🗂️ Pengelompokan Kategori Dropdown Sidebar Admin (*Collapsible Accordion*)
- **Deskripsi:** Merestrukturisasi menu navigasi sidebar admin yang sebelumnya panjang menjadi 4 kategori dropdown yang rapi, modern, dan mudah dinavigasi.
- **Kategori yang Dibuat:**
  1. **Operasional & Kamar:**
     - 📋 *Reservasi & Front Desk* (`/admin/bookings`)
     - 🚪 *Unit Kamar Fisik* (`/admin/rooms`)
     - 🛏️ *Tipe Kamar & Suite* (`/admin/services` - *Super Admin*)
  2. **Layanan & Promosi:**
     - ☕ *Layanan Tambahan / Add-Ons* (`/admin/categories` - *Super Admin*)
     - 🎟️ *Kupon & Promo Diskon* (`/admin/coupons` - *Super Admin*)
  3. **Tamu & Akun Staf:**
     - 👥 *Buku Tamu / Guest Book* (`/admin/customers`)
     - 👤 *Kelola User & Staf* (`/admin/users` - *Super Admin*)
  4. **Keuangan & Laporan:**
     - 💳 *Transaksi Pembayaran* (`/admin/payments` - *Super Admin*)
     - 📊 *Laporan Finansial* (`/admin/reports` - *Super Admin*)
  5. **Menu Tunggal:**
     - 📊 *Dashboard Hotel* (Paling atas)
     - 🏨 *Profil & Aturan Hotel* (`/admin/schedules` - *Super Admin*)
- **Fitur Navigasi:**
  - Auto-expand otomatis pada kategori yang sedang aktif berdasarkan URL.
  - Role-based visibility: Front Desk hanya melihat menu yang diizinkan, kategori tanpa hak akses otomatis disembunyikan.

---

### 2. 🛡️ Penanganan Gangguan Sinyal & Anti-Pembayaran Ganda (*Anti-Double Payment*)
- **Deskripsi:** Solusi komprehensif ketika tamu mengalami koneksi buruk/timeout saat membayar, serta memastikan dana tamu tidak pernah terdebit ganda.
- **Implementasi:**
  - **Deteksi Koneksi & Fallback UI:** Komponen baru [`PaymentConnectionModal.jsx`](frontend/src/components/common/PaymentConnectionModal.jsx) yang muncul saat sinyal terputus, dilengkapi tombol *Coba Bayar Lagi* dan *Periksa Status Pembayaran*.
  - **Idempotensi Pembuatan Reservasi:** Backend otomatis memulihkan booking yang sedang di-hold jika tamu mencoba lagi dengan tanggal yang sama, mencegah error 409 overbooked palsu.
  - **Auto-Reconciliation Midtrans:** Sebelum membuat Snap token baru, backend otomatis memeriksa status ke server Midtrans. Jika transaksi sebelumnya sudah lunas (*settled*), sistem langsung menandai LUNAS dan mencegah Snap checkout kedua dipanggil.
  - **Pencegahan Double-Click:** Proteksi status loading & debounce saat tombol bayar ditekan.

---

### 3. 📄 Fitur Unduh Invoice Resmi Pembayaran (PDF & Siap Cetak)
- **Deskripsi:** Template invoice resmi hotel bintang lima yang dapat langsung diunduh atau dicetak oleh tamu maupun kasir admin.
- **Komponen:** [`InvoiceModal.jsx`](frontend/src/components/common/InvoiceModal.jsx)
- **Detail Dokumen:**
  - Nomor Invoice unik: `INV/{TAHUN}/{booking_code}`
  - Badge hijau **LUNAS / PAID (Terverifikasi Otomatis)**
  - Identitas tamu, tipe kamar, nomor unit kamar fisik, durasi menginap
  - Tabel rincian biaya sewa kamar, layanan add-on itemized, potongan kupon diskon, dan pajak 10%
  - Metode pembayaran (Midtrans, QRIS EDC Bank, atau Bayar di Tempat)
  - Format cetak A4 bersih menggunakan print stylesheet (`@media print`).
- **Akses:** Halaman Pembayaran Berhasil, Dashboard Tamu, dan Tabel Reservasi Front Desk.

---

### 4. 📱 Fitur Unduh Gambar QRIS Nasional (PNG & Cetak)
- **Deskripsi:** Kemampuan mengunduh dan mencetak gambar QRIS berstandar nasional (EMVCo QRIS).
- **Komponen:** [`QrisDownloadModal.jsx`](frontend/src/components/common/QrisDownloadModal.jsx) menggunakan library `qrcode`.
- **Desain Flyer Standee:**
  - Header merah resmi *QRIS - Pembayaran Digital Nasional*
  - NMID Merchant, Nama Hotel *The Royal Nusantara*
  - Nominal tagihan pas dan kode booking
  - Tombol **"Unduh QRIS (PNG)"** untuk menyimpan ke galeri ponsel dan tombol **"Cetak QRIS"** untuk mencetak struk barcode.

---

### 5. 💡 Panduan & Transparansi Layanan Tambahan (*Add-Ons*) untuk Tamu
- **Deskripsi:** Banner edukatif dan kalkulasi transparan saat tamu memilih add-on di halaman pemesanan kamar ([`BookingFlowPage.jsx`](frontend/src/pages/customer/BookingFlowPage.jsx)).
- **Fitur:**
  - Penjelasan perbedaan biaya **Per Malam** (dikalikan durasi menginap) vs **Per Masa Inap / Flat** (1x biaya).
  - Tombol pengatur kuantitas (+ / - pax).
  - Kalkulasi subtotal realtime per item yang dicentang.
  - Kepastian bahwa seluruh add-on otomatis tercatat pada invoice resmi.

---

### 6. ⏰ Penambahan Jam Check-Out & Check-In Standar
- **Deskripsi:** Penambahan jam operasional front desk secara eksplisit di seluruh sistem:
  - **Check-In:** Mulai pukul **14:00 WIB**.
  - **Check-Out:** Maksimal pukul **12:00 WIB**.
  - **Jam Aktual Check-Out:** Jika tamu sudah selesai check-out, sistem menampilkan jam aktual check-out (contoh: *Selesai: 11:30 WIB*).
- **Helper Baru:** `formatCheckoutTime()` pada [`format.js`](frontend/src/utils/format.js).

---

### 7. 👤 Dropdown Profil Kanan Atas & Pembersihan Sidebar
- **Deskripsi:** Pemindahan tombol Logout dan info profil dari bagian bawah sidebar ke dropdown profil avatar interaktif di header kanan atas.
- **Fitur Dropdown:**
  - Menampilkan nama, email, dan badge role (*Super Admin* / *Front Desk*).
  - Menu **Cek Profil** (`/admin/profile`) di dalam layout admin.
  - Tombol **Logout** aman.
  - Tombol **Key Otorisasi Batal** khusus Super Admin (tombol di sidebar dihapus agar sidebar tetap bersih).

---

### 8. 📊 Laporan Finansial: Breakdown Saldo Masuk & Ekspor Excel
- **Deskripsi:** Analitik finansial detail bentuk uang masuk:
  - Tunai / Cash (Front Desk)
  - QRIS EDC (BCA, BRI, BTN, Mandiri)
  - Kartu Debit EDC
  - Kartu Kredit EDC
  - Transaksi Online Midtrans
- **Ekspor Excel:** Tombol ekspor `.xlsx` multi-sheet (*Ringkasan Finansial* & *Rincian Reservasi*) via library `xlsx`.

---

### 9. 💳 Front Desk "Bayar di Tempat" Multi-Kanal EDC
- **Deskripsi:** Pilihan pembayaran saat tamu tiba di meja resepsionis:
  - Pembayaran Tunai (Cash)
  - QRIS EDC (Pilihan Rekening Bank: BCA, BRI, BTN, Mandiri + input nomor RRN struk)
  - Debit Card EDC & Credit Card EDC
  - Otomatis mengubah reservasi menjadi LUNAS dan mencatat kanal bank ke laporan keuangan.

---

### 10. 🏨 Validasi Batas Waktu Check-In & Penanganan Status Hangus
- **Deskripsi:** Mengatasi anomali di mana reservasi yang sudah melewati batas tanggal menginap masih berstatus Terkonfirmasi dan tombol Check-In masih menyala hijau. Menggunakan istilah baku yang ramah: **Hangus**.
- **Implementasi:**
  - **Status Resmi `NO_SHOW` (Label UI: "Hangus"):** Status `Booking::STATUS_NO_SHOW` ('NO_SHOW') pada model `Booking` ditampilkan ke staf dan tamu sebagai **Hangus**.
  - **Proteksi Cerdas UI Front Desk (`AdminBookingsPage`):**
    - **Jika Hari Ini > Tanggal Check-Out:** Tombol Check-In disembunyikan. Muncul status peringatan *"Lewat Jadwal (Reservasi Hangus)"* dan tombol aksi **`Tandai Hangus`** berwarna merah muda.
    - **Jika Hari Ini < Tanggal Check-In:** Tombol Check-In dinonaktifkan dengan label *"Belum Waktunya"* serta tooltip informasi jam buka check-in (14:00 WIB).
    - **Jika Hari Ini Berada dalam Rentang Menginap:** Tombol hijau **`Check-In`** aktif normal.
    - **Filter Tab Baru:** Tab status *"Hangus"* ditambahkan pada filter bar reservasi front desk.
  - **Penyempurnaan Invoice Pintar (`InvoiceModal.jsx`):**
    - Memperbaiki anomali di mana sebelumnya invoice menampilkan badge `LUNAS / PAID` secara statis bahkan saat reservasi adalah bayar di tempat yang tidak pernah dibayar karena tamu tidak hadir.
    - **Kondisi 1 (Sudah Lunas tapi Hangus):** Menampilkan badge ganda `LUNAS / PAID` + `RESERVASI HANGUS`, banner peringatan bahwa dana non-refundable, dan stempel audit `LUNAS (RESERVASI HANGUS)`.
    - **Kondisi 2 (Bayar di Tempat & Hangus):** Menampilkan badge `TIDAK DIBAYAR` + `RESERVASI HANGUS`, keterangan tagihan tidak pernah diselesaikan, dan stempel `VOID • TIDAK DIBAYAR`.
  - **Artisan Command Otomatis (`bookings:mark-no-show`):**
    - Perintah CLI `php artisan bookings:mark-no-show` yang otomatis mendeteksi dan mengalihkan seluruh reservasi terkonfirmasi yang tanggal check-out-nya sudah lewat tanpa check-in menjadi status `NO_SHOW`.
    - Didaftarkan ke scheduler Laravel (`routes/console.php`) agar berjalan otomatis setiap jam/hari.
    - Jika ada pembayaran offline yang belum terselesaikan, otomatis dibatalkan.
  - **Endpoint API Manual:** `POST /api/v1/admin/bookings/{id}/no-show` untuk staf front desk menandai reservasi yang dipastikan tidak datang.

### 11. 💡 Penjelasan Layanan Tambahan (Add-On) & Diskon Sebelum dan Setelah Pembayaran
- **Deskripsi:** Menambahkan panduan dan penjelasan komprehensif untuk tamu hotel terkait cara kerja layanan tambahan dan diskon kupon promo baik sebelum melakukan pembayaran maupun setelah pembayaran berhasil.
- **Implementasi:**
  - **Sebelum Pembayaran ([`BookingFlowPage.jsx`](frontend/src/pages/customer/BookingFlowPage.jsx)):**
    - *Panduan Add-On:* Penjelasan perbedaan tarif add-on per malam (*dikali durasi inap*) vs per menginap (*1x bayar*) dengan simulasi subtotal realtime.
    - *Penjelasan Diskon Kupon:* Informasi jelas bahwa kode kupon otomatis memotong subtotal biaya sewa kamar sebelum tombol bayar ditekan, menghasilkan total tagihan bersih.
  - **Setelah Pembayaran ([`PaymentResultPage.jsx`](frontend/src/pages/customer/PaymentResultPage.jsx)):**
    - *Rincian Layanan Tambahan Terpilih:* Daftar item add-on yang sudah dibooking tercantum rapi pada tanda terima.
    - *Panduan Tambah Add-On Susulan:* Kartu penjelasan bahwa tamu tetap dapat menambah fasilitas ekstra (sarapan buffet, airport pickup, extra bed, spa) saat check-in di meja Front Desk dengan pelunasan tunai/EDC di tempat.
    - *Penjelasan Status Diskon:* Keterangan resmi bahwa diskon kupon promo telah sukses memotong tagihan, kupon kini berstatus terpakai untuk reservasi ini, dan add-on susulan yang dipesan di tempat berlaku tarif normal hotel.

---

## 🧪 Status Verifikasi Pengujian
- **Backend Tests:** **90 test / 423 assertions lolos (100% Passed)** melalui PHPUnit.
- **Frontend Build:** **Vite build lolos tanpa error (1.30s)**.

