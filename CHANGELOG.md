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

### 12. 🎨 Kustomisasi Scrollbar Minimalis & Ramping (Thin Modern Scrollbar)
- **Deskripsi:** Mengganti tampilan scrollbar default browser/Windows yang tebal dan kaku menjadi scrollbar ramping, minimalis, dan elegan di seluruh antarmuka web hotel.
- **Implementasi:**
  - **Global Minimalist Scrollbar ([`index.css`](frontend/src/index.css)):**
    - Menggunakan standar CSS modern `scrollbar-width: thin` dan `scrollbar-color`.
    - Fallback WebKit (`::-webkit-scrollbar` width/height 6px, track transparan, thumb rounded semi-transparan `rgba(148, 163, 184, 0.4)` dengan efek hover halus).
    - Otomatis berlaku untuk seluruh halaman utama, tabel data, modal, dan elemen scrollable lainnya.
  - **Dark Surface Scrollbar ([`AdminLayout.jsx`](frontend/src/layouts/AdminLayout.jsx)):**
    - Class utility `.custom-scrollbar-dark` khusus untuk bilah navigasi Sidebar Admin berlatar gelap (`bg-slate-950`), dengan thumb transparan putih (`rgba(255, 255, 255, 0.18)`) berukuran 5px sehingga menyatu mulus tanpa garis putih tebal yang mengganggu.

### 13. 📐 Fitur Tutup/Buka Sidebar Admin (Collapsible Sidebar for Wide View)
- **Deskripsi:** Menambahkan tombol ciutkan/tutup sidebar pada header sidebar admin (`<`) dan tombol buka menu (`Menu`) di navbar utama agar staf front desk dan admin dapat memperluas tabel reservasi dan laporan finansial hingga lebar maksimal monitor.
- **Implementasi:**
  - **Tombol Tutup Sidebar ([`AdminLayout.jsx`](frontend/src/layouts/AdminLayout.jsx)):** Tombol panah `<` (`ChevronLeft`) di pojok kanan atas sidebar samping judul Royal Nusantara. Saat diklik, sidebar bergeser mulus menutup ke kiri (`-translate-x-full`).
  - **Area Konten Melebar Otomatis:** Konten utama otomatis menyesuaikan padding dari `lg:pl-64` menjadi `lg:pl-0` dengan transisi halus (`transition-all duration-300`) serta batas lebar diperluas hingga `1600px` untuk tampilan tabel yang sangat leluasa.
  - **Tombol Buka Kembali di Navbar:** Terdapat tombol `Menu` + badge *"Menu Sidebar"* di header atas untuk membuka kembali sidebar kapan saja.
  - **Penyimpanan Preferensi (`localStorage`):** Preferensi status buka/tutup sidebar disimpan di browser sehingga tidak kembali terbuka secara otomatis saat berpindah halaman atau merefresh web.

### 14. 🏷️ Penyederhanaan Status Reservasi Terlewat Menjadi Badge Tunggal "Hangus"
- **Deskripsi:** Menyederhanakan tampilan kolom Status pada tabel reservasi Front Desk untuk booking yang melewati masa menginap tanpa check-in agar seragam dan rapi dengan badge tunggal `Hangus`.
- **Implementasi:**
  - **Tampilan Badge Tunggal ([`AdminBookingsPage.jsx`](frontend/src/pages/admin/AdminBookingsPage.jsx)):** Menghapus blok status bertingkat `[Lewat Jadwal]` + teks kecil `Reservasi Hangus`, dan menggantinya dengan badge tunggal berlabel **`Hangus`** (`bg-rose-50 text-rose-700 border-rose-200`) yang rapi dan konsisten dengan tab filter *"Hangus"*.
  - **Auto-Sync Status Database ([`HotelBookingController.php`](backend/app/Http/Controllers/Api/V1/HotelBookingController.php)):** Pada endpoint `adminIndex`, sistem secara otomatis memindai dan menyinkronkan setiap booking berstatus `CONFIRMED` yang telah melewati tanggal checkout (`check_out_date <= hari ini`) menjadi status `NO_SHOW` (Hangus) beserta pembatalan sisa tagihan tertunda dan pencatatan riwayat audit.

### 15. 🛠️ Perbaikan Validasi Tambah/Edit Layanan Add-On (Price Type "Per Masa Inap")
- **Masalah:** Saat admin menyimpan layanan add-on baru dengan memilih model tarif *"Per Masa Inap (Flat Sekali Bayar)"*, muncul error `The selected price type is invalid.`
- **Penyebab:** Frontend mengirimkan nilai `price_type: 'per_stay'`, sedangkan aturan validasi Laravel di backend controller ([`HotelController.php`](backend/app/Http/Controllers/Api/V1/HotelController.php)) sebelumnya hanya menerima `in:per_booking,per_night,per_guest`.
- **Solusi & Implementasi:**
  - **Backend Controller ([`HotelController.php`](backend/app/Http/Controllers/Api/V1/HotelController.php)):** Menambahkan `per_stay` ke dalam aturan validasi `price_type` pada fungsi `storeExtraService` dan `updateExtraService`, disertai pesan validasi berbahasa Indonesia.
  - **Form Sanitasi Data ([`AdminCategoriesPage.jsx`](frontend/src/pages/admin/AdminCategoriesPage.jsx)):** Memastikan nilai harga (`price`) diparsing sebagai angka nominal bersih (`Number(price)`), trimming teks nama & deskripsi, serta standarisasi penentuan label *"Per Masa Inap"* vs *"Per Malam"*.
  - **Konsistensi Perhitungan Tarif Tamu ([`BookingFlowPage.jsx`](frontend/src/pages/customer/BookingFlowPage.jsx) & [`HomePage.jsx`](frontend/src/pages/public/HomePage.jsx)):** Memastikan bahwa seluruh add-on non-malam (`per_stay`, `per_booking`, `per_guest`) dihitung flat 1x dan berlabel *"1x per masa inap"* tanpa terjadi salah pengalian jumlah malam.
  - **Automated Feature Test ([`FrontDeskRoleTest.php`](backend/tests/Feature/FrontDeskRoleTest.php)):** Menambahkan unit & feature test untuk memastikan Super Admin dapat membuat dan memperbarui add-on dengan model `per_stay` dan `per_night` secara sempurna.

### 16. 🛡️ Sanitasi Keamanan Data Response Payload Pembayaran (Signature & Merchant Protection)
- **Masalah:** Pada modal *"Detail Transaksi Midtrans"* di halaman Manajemen Pembayaran Admin, tampilan JSON mentah `Response Payload Terakhir` mengekspos data sensitif internal gateway seperti `signature_key` (kunci hash rahasia server), `merchant_id`, dan `approval_code` otorisasi perbankan.
- **Solusi & Implementasi:**
  - **Backend Model Sanitization ([`Payment.php`](backend/app/Models/Payment.php)):** Menambahkan Accessor dan Mutator otomatis pada atribut `provider_response` menggunakan `Attribute::make()`. Secara otomatis menghapus parameter sensitif (`signature_key`, `merchant_id`, `approval_code`) saat serialisasi ke API maupun saat penyimpanan baru ke database, serta menerapkan masking standar PCI DSS pada nomor kartu (`4811-****-****-1114`).
  - **Frontend Client Sanitization ([`AdminPaymentsPage.jsx`](frontend/src/pages/admin/AdminPaymentsPage.jsx)):** Menambahkan fungsi pembersih lapis kedua `getSanitizedPayload()` dan menyematkan badge status `🛡️ Parameter Sensitif & Signature Terlindungi` pada tampilan payload modal agar staf/admin mendapat kepastian bahwa kredensial rahasia terlindungi.
  - **Automated Feature Test ([`PaymentShowTest.php`](backend/tests/Feature/PaymentShowTest.php)):** Menambahkan pengujian integrasi `test_payment_sanitizes_sensitive_keys_from_provider_response` yang memastikan kunci-kunci sensitif tersebut terbukti hilang (`assertJsonMissing`) pada respons endpoint API.

### 17. ✨ Redesain Modal Detail Transaksi (Opsi 3: Minimalis, Bersih & Ramah Operasional)
- **Deskripsi:** Mengganti tampilan modal inspeksi transaksi pembayaran pada [`AdminPaymentsPage.jsx`](frontend/src/pages/admin/AdminPaymentsPage.jsx) sesuai arahan pengguna (Opsi 3 Minimalis) dengan menghilangkan istilah teknis programmer dan kotak hitam JSON mentah.
- **Perubahan Tampilan:**
  - **Menghapus Blok Hitam JSON:** Kotak hitam `Response Payload Terakhir` dihilangkan sepenuhnya, sehingga tampilan tidak lagi terlihat seperti layar *debug* pengembang.
  - **Menghilangkan Istilah Teknis Asing:** UUID panjang mentah (*Midtrans Transaction ID*), *Status Provider* (`capture`/`settlement`), dan *Fraud Status* (`accept`) diganti menjadi informasi bisnis yang relevan bagi hotel.
  - **Kartu Ringkasan Finansial:** Menampilkan kotak sorotan nominal bersih (`formatRupiah`) dan badge status resmi pelunasan (*Lunas*, *Menunggu Pembayaran*, dll).
  - **Daftar Informasi Minimalis & Jelas:**
    - *No. Referensi (Order ID):* Kode order transaksi berlatar abu-abu rapi.
    - *Kode Reservasi:* Link/badge kode booking hotel (`HTL-XXXXX`).
    - *Nama Tamu & Tipe Kamar:* Identitas pemesan dan unit kamar terkait.
    - *Metode Pembayaran Ramah Manusia:* Format nama metode yang jelas (misal: *Kartu Kredit (4811-****-1114)*, *QRIS Digital*, *Virtual Account*, atau *Tunai / Kasir Front Desk*).
    - *Waktu Pelunasan:* Tanggal dan jam pelunasan transaksi.
    - *Status Verifikasi:* Badge hijau `Terverifikasi Berhasil & Aman`.

### 18. 📊 Optimasi Skala & Redesain Kompak Laporan Finansial
- **Deskripsi:** Menyesuaikan proporsi halaman [`AdminReportsPage.jsx`](frontend/src/pages/admin/AdminReportsPage.jsx) yang sebelumnya terlalu besar dan memakan ruang vertikal layar secara berlebihan.
- **Pembaruan:**
  - **Toolbar Filter Cerdas & Tombol Preset:** Menggantikan kotak filter tanggal besar dengan toolbar ramping yang dilengkapi tombol preset instan (*Bulan Ini*, *Bulan Lalu*, *7 Hari*, *30 Hari*) sehingga staf dapat berganti rentang waktu dengan 1 klik.
  - **Redesain Kartu KPI Proporsional (Grid 4 Kolom):** Mengubah 2 kartu raksasa sebelumnya menjadi 4 kartu metrik proporsional (*Total Pendapatan Terverifikasi*, *Total Reservasi*, *Rata-Rata Nilai per Booking*, dan *Layanan Terlaris*), mengurangi ketinggian vertikal hingga 45%.
  - **Sleek Payment Inflows Bar:** Mempercantik bar proporsi arus kas (*Tunai*, *QRIS*, *Debit*, *Kredit*, *Midtrans*) menjadi bilah 10px yang anggun dan 5 kartu kanal pembayaran yang kompak.
  - **Tabel & Ranking Layanan Ramping:** Mengurangi padding tabel (*px-3.5 py-2.5*) agar daftar reservasi dapat terlihat langsung tanpa harus banyak scroll.

### 19. 💳 Peningkatan Desain Halaman Transaksi Pembayaran (Hotel PMS Standard)
- **Deskripsi:** Mempercantik antarmuka [`AdminPaymentsPage.jsx`](frontend/src/pages/admin/AdminPaymentsPage.jsx) agar berstandar hotel mewah dan selaras dengan halaman operasional lainnya.
- **Pembaruan:**
  - **Mini KPI Strip Pembayaran:** Menambahkan 3 kartu ringkasan cepat di bagian atas (*Total Transaksi Lunas*, *Menunggu Pelunasan*, dan *Antrean Refund*).
  - **Filter Status Berbentuk Tab Pills:** Menggantikan dropdown `<select>` standar dengan tombol filter pill interaktif (*Semua Status*, *Lunas (PAID)*, *Menunggu Bayar*, *Perlu Refund*, dll) lengkap dengan badge hitungan antrean refund.
  - **Search Bar Modern Berfitur Reset:** Input pencarian responsif dengan ikon search dan tombol clear `✕`.
  - **Estetika Tabel & Badge Metode Berikon:** Menyempurnakan baris tabel dengan badge metode pembayaran berikon (*Tunai*, *QRIS*, *Debit EDC*, *CC EDC*, *Snap*) serta tombol aksi *"Detail"* dan *"Proses Refund"* yang elegan.

### 20. 📅 Penambahan Filter Rentang Tanggal & Preset pada Transaksi Pembayaran
- **Deskripsi:** Menambahkan fitur filter tanggal (mirip dengan Laporan Finansial) pada halaman Transaksi Pembayaran ([`AdminPaymentsPage.jsx`](frontend/src/pages/admin/AdminPaymentsPage.jsx)) dan backend controller ([`PaymentController.php`](backend/app/Http/Controllers/Api/V1/PaymentController.php)).
- **Fitur Baru:**
  - **Tombol Preset Instan:** Staf dapat menyaring transaksi dengan 1 klik: *Bulan Ini*, *Bulan Lalu*, *7 Hari*, *30 Hari*, atau *Reset Tanggal*.
  - **Filter Kalender Fleksibel:** Form input tanggal *Dari* dan *Sampai* untuk memilih rentang kustom.
  - **Backend Support:** Endpoint `adminIndex` kini mendukung parameter `start_date` dan `end_date` untuk query berbasis tanggal transaksi.
  - **Pengujian:** Pengujian integrasi `test_admin_can_filter_payments_by_date_range` ditambahkan di [`PaymentShowTest.php`](backend/tests/Feature/PaymentShowTest.php) dan lulus 100%.

### 21. 🧹 Pembersihan Kontrol Refund pada Halaman Transaksi Pembayaran
- **Deskripsi:** Menghapus seluruh elemen dan tombol refund dari [`AdminPaymentsPage.jsx`](frontend/src/pages/admin/AdminPaymentsPage.jsx) sesuai instruksi pengguna agar halaman murni fokus pada pencatatan dan monitoring mutasi transaksi pembayaran.
- **Pembersihan:**
  - Menghapus tombol aksi *"Proses Refund"* dari tabel transaksi pembayaran.
  - Menghapus banner peringatan oranye antrean refund.
  - Mengganti kartu KPI ke-3 dari *"Pengembalian Dana (Refund)"* menjadi *"Total Transaksi Tercatat"* (dengan ikon receipt dan jumlah transaksi pada filter aktif).
  - Menghapus tab filter status `REFUND_PENDING` dan `REFUNDED` dari deretan tab status.
  - Menghapus komponen modal konfirmasi refund (`ConfirmModal`) dan seluruh state pendukungnya.

### 22. 📑 Format Ekspor Excel Profesional Standar PMS Bintang Lima (Multi-Sheet Ledger)
- **Deskripsi:** Memperbarui fungsi ekspor ke format Microsoft Excel (`.xlsx`) pada [`AdminReportsPage.jsx`](frontend/src/pages/admin/AdminReportsPage.jsx) agar menghasilkan dokumen pembukuan finansial hotel yang eksekutif, rapi, dan berstandar akuntansi resmi.
- **Pembaruan Arsitektur Dokumen Excel (3 Lembar Kerja / Sheets):**
  1. **Sheet 1: `Ringkasan Finansial` (Executive Financial & Inflow Summary)**:
     - **Kop Surat Resmi Hotel:** Header formal *THE ROYAL NUSANTARA RESORT & SPA*, judul dokumen, subtitle PMS Financial Ledger, dan blok metadata audit (periode tanggal, tanggal cetak, status dokumen, dan mata uang).
     - **Tabel I (Executive KPI):** Total pendapatan terverifikasi (format akuntansi `"Rp "#,##0`), total booking (`#,##0`), rata-rata pendapatan per reservasi (ADR), akumulasi transaksi kasir Front Desk, dan transaksi online Midtrans.
     - **Tabel II (Payment Inflows Breakdown):** Rekapitulasi lengkap 5 kanal penerimaan (*Tunai Kasir*, *QRIS EDC*, *Debit EDC*, *Kredit EDC*, *Midtrans Gateway*) dengan formula otomatis `=SUM(...)` untuk volume transaksi, persentase (`0.0%`), dan total nominal rupiah.
     - **Tabel III (Rincian EDC Per Bank Mitra):** Matriks distribusi pendapatan EDC untuk BCA, BRI, BTN, dan Bank Mandiri lengkap dengan baris subtotal formula.
  2. **Sheet 2: `Buku Besar Reservasi` (Detailed Reservation Ledger)**:
     - **16 Kolom Terstruktur:** `No`, `Kode Booking`, `Tanggal Order`, `Nama Tamu`, `Email Tamu`, `No. Telepon / WA`, `Tipe Kamar / Layanan`, `No. Kamar Fisik`, `Tanggal Check-In`, `Tanggal Check-Out`, `Durasi (Malam)`, `Total Biaya (IDR)`, `Metode Reservasi`, `Bentuk Pelunasan / EDC`, `No. Referensi / RRN`, dan `Status Reservasi`.
     - **Formatting Akuntansi:** Seluruh durasi diformat angka `#,##0`, total biaya diformat Rupiah `"Rp "#,##0`.
     - **Baris Total Akumulasi:** Menggunakan formula `=SUM(...)` dinamis untuk menghitung total malam kamar dan total nominal uang masuk.
     - **Fitur Interaktif:** Dilengkapi Auto-Filter (`!autofilter`) aktif pada seluruh kolom dan lebar kolom proporsional (`!cols`) agar data tidak terpotong.
  3. **Sheet 3: `Performa Layanan & Kamar` (Product & Room Type Performance)**:
     - **Matriks Popularitas Kamar & Layanan:** Tabel pemeringkatan tipe kamar dan add-on terlaris beserta tarif satuan, frekuensi pemesanan, estimasi kontribusi omset, dan pangsa pemesanan (*market share %*).
     - **Baris Ringkasan:** Formula akumulasi total frekuensi pemesanan dan total estimasi kontribusi omset.

### 23. 🖨️ Format Ekspor / Cetak PDF Resmi Standar Audit Hotel Bintang Lima (Printable PMS Ledger)
- **Deskripsi:** Memperbarui fungsi **Cetak / PDF** pada [`AdminReportsPage.jsx`](frontend/src/pages/admin/AdminReportsPage.jsx) yang sebelumnya hanya mencetak layar web biasa (beserta navbar, sidebar, filter, dan tombol) menjadi dokumen laporan keuangan resmi A4 siap unduh/cetak yang elegan, presisi, dan profesional.
- **Pembaruan Layout Dokumen Cetak / PDF (`#printable-report`):**
  - **Kop Surat Resmi Hotel (Hotel Letterhead):** Lambang hotel resmi, nama *HOTEL THE ROYAL NUSANTARA RESORT & SPA*, sub-brand resort & convention, alamat lengkap Nusa Dua Bali, nomor telepon, email resmi, nomor referensi dokumen unik audit, dan stempel status `Terverifikasi Sistem Keuangan (Audited)`.
  - **Grid Metadata Audit (4 Kolom):** Periode pembukuan, tanggal & waktu penerbitan dokumen, total volume reservasi, dan mata uang IDR.
  - **1. Indikator Kinerja Finansial Utama (KPI Overview):** Ringkasan kartu metrik formal mencakup total omset terverifikasi, jumlah reservasi, rerata nilai per reservasi (ADR), dan rasio pelunasan kasir front desk vs online Midtrans.
  - **2. Rekapitulasi Bentuk Uang Masuk (Payment Inflows Breakdown):** Tabel formal penerimaan uang tunai kasir, QRIS EDC, Debit EDC, Kredit EDC, dan Midtrans Snap beserta persentase kontribusi dan baris total terverifikasi.
  - **3. Matriks Distribusi Mesin EDC per Bank Mitra:** Tabel rincian perolehan EDC untuk BCA, BRI, BTN, dan Bank Mandiri.
  - **4. Statistik Popularitas Tipe Kamar & Layanan:** Pemeringkatan tipe kamar dan layanan terlaris dengan tarif satuan, frekuensi order, dan estimasi omset.
  - **5. Buku Besar Rincian Transaksi Reservasi Tamu:** Tabel pembukuan lengkap dengan kolom No, Kode Booking, Tanggal Pemesanan, Nama Tamu & Kontak, Kamar & Unit Fisik, Check-In, Check-Out, Durasi Malam, Nominal Tagihan, Metode Pelunasan, dan Status, diakhiri baris total akumulasi malam & nominal.
  - **6. Lembar Pengesahan & Tanda Tangan Resmi (Sign-off Section):** Tiga kolom tanda tangan otorisasi bergaris titik-titik dan tanggal (*Dibuat Oleh: Front Desk & Night Auditor*, *Diverifikasi Oleh: Financial Controller / Kasir Utama*, *Disetujui Oleh: General Manager Hotel*) serta catatan kaki penafian audit PMS resmi.
- **Penerapan Print Stylesheet Khusus (`@media print`):**
  - Menyembunyikan seluruh sidebar, top navbar, filter toolbar, tombol kontrol, dan elemen web lainnya.
  - Menampilkan `#printable-report` secara penuh berukuran A4 portrait dengan margin proporsional dan `print-color-adjust: exact`.
  - Proteksi `page-break-inside: avoid` pada kartu metrik, tabel rekapitulasi, dan lembar tanda tangan agar tata letak halaman tidak terpotong saat disimpan sebagai file PDF.

### 24. 🖼️ Fleksibilitas Foto Tipe Kamar: Dukungan Unggah File Lokal & Input URL Gambar
- **Deskripsi:** Menambahkan kemampuan upload foto tipe kamar/suite dari file perangkat (komputer/HP) maupun input tautan gambar URL web pada form tambah & edit tipe kamar ([`AdminServicesPage.jsx`](frontend/src/pages/admin/AdminServicesPage.jsx)) serta controller backend ([`RoomTypeController.php`](backend/app/Http/Controllers/Api/V1/RoomTypeController.php)).
- **Fitur Baru & Pembaruan:**
  - **Tab Switcher Sumber Foto (File vs URL):** Pengguna dapat memilih mode input foto dengan satu klik:
    - *📁 Unggah File:* Dropzone interaktif untuk memilih file foto langsung dari perangkat (JPG, PNG, WebP hingga 5 MB).
    - *🔗 Gunakan URL:* Input field tautan URL langsung untuk foto dari Unsplash, Pexels, atau CDN eksternal.
  - **Live Photo Preview & Tombol Hapus:** Menampilkan thumbnail kartu foto kamar seketika saat file dipilih atau URL diketik, dilengkapi tombol *"Hapus Foto"* untuk menghapus atau mengganti foto.
  - **Backend Support Fleksibel (File Storage & URL):**
    - Mendukung penerimaan file `featured_image` via `multipart/form-data` yang disimpan ke `storage/app/public/rooms` secara aman.
    - Mendukung penerimaan string URL gambar `image_url` untuk tautan eksternal.
    - Otomatis menghapus file foto fisik lama saat pengguna mengganti atau menghapus foto kamar.
  - **Resolusi URL Cerdas di Frontend ([`RoomImage.jsx`](frontend/src/components/common/RoomImage.jsx)):** Helper `resolveImageUrl` otomatis mendeteksi URL penuh (`https://`), `blob:`, maupun subpath penyimpanan lokal (`storage/rooms/...`). Ditambahkan juga atribut performa `loading="lazy"` dan `decoding="async"`.
  - **Pengujian Otomatis:** Menambahkan 3 skenario uji baru di [`RoomRulesTest.php`](backend/tests/Feature/RoomRulesTest.php) (`test_super_admin_can_create_room_type_with_image_url`, `test_super_admin_can_create_room_type_with_uploaded_file`, `test_super_admin_can_update_room_type_with_new_image_or_remove_it`).

### 25. 🖼️ Penetapan Foto URL Langsung untuk Seluruh Tipe Kamar
- **Deskripsi:** Menetapkan foto beresolusi tinggi langsung melalui URL web (*Unsplash luxury resort & suite*) ke seluruh tipe kamar yang ada di database hotel serta memperbarui `DatabaseSeeder.php`.
- **Daftar Foto Tipe Kamar yang Diterapkan:**
  1. **Deluxe Ocean View King Room:**
     - URL: `https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80`
  2. **Executive Twin Garden Suite:**
     - URL: `https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80`
  3. **Royal Honeymoon Suite with Jacuzzi:**
     - URL: `https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80`
  4. **Presidential Ocean Penthouse Suite:**
     - URL: `https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80`
  5. **Private Pool Family Villa:**
     - URL: `https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80`
- **File Diperbarui:**
  - [`backend/database/seeders/DatabaseSeeder.php`](file:///c:/laragon/www/laravel-booking/backend/database/seeders/DatabaseSeeder.php)
  - [`backend/database/seeders/RoomTypeImageSeeder.php`](file:///c:/laragon/www/laravel-booking/backend/database/seeders/RoomTypeImageSeeder.php)

---

## 🧪 Status Verifikasi Pengujian
- **Backend Tests:** **95 test / 447 assertions lolos (100% Passed)** melalui PHPUnit.
- **Frontend Build:** **Vite build lolos tanpa error (1.15s)**.

