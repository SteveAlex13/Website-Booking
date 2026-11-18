# Catatan Perubahan Kode

File ini berisi semua perubahan kode pada proyek booking hotel selama proses setup dan pengujian: file mana yang diubah, apa masalahnya, bagaimana kode sebelumnya, dan kode lengkap sesudahnya. Mahasiswa bisa menyalin kode "Sesudah" ke file yang sama untuk mengulang setiap perubahan.

Backend memakai Laravel (`backend/`). Frontend memakai React + Vite (`frontend/`).

## Daftar Isi

- [1. PaymentController: memuat relasi yang masih ada](#1-paymentcontroller-memuat-relasi-yang-masih-ada)
- [2. BookingFlowPage: membaca `room_type` dari respons](#2-bookingflowpage-membaca-room_type-dari-respons)
- [3. AdminDashboardPage: memakai nama variabel yang sudah dideklarasikan](#3-admindashboardpage-memakai-nama-variabel-yang-sudah-dideklarasikan)
- [4. CustomerDashboardPage: hitung mundur pembayaran](#4-customerdashboardpage-hitung-mundur-pembayaran)
- [5. Judul tab browser untuk setiap halaman](#5-judul-tab-browser-untuk-setiap-halaman)
- [6. Test baru](#6-test-baru)
   - [6a. Helper bersama (file baru)](#6a-helper-bersama-file-baru)
   - [6b. Test status webhook (file baru)](#6b-test-status-webhook-file-baru)
   - [6c. Test endpoint pembayaran (file baru)](#6c-test-endpoint-pembayaran-file-baru)
- [7. composer.json: platform PHP 8.3](#7-composerjson-platform-php-83)
- [8. .gitignore (file baru di root proyek)](#8-gitignore-file-baru-di-root-proyek)
- [9. Harga murah di seeder](#9-harga-murah-di-seeder)
- [Cara memeriksa hasil kerja](#cara-memeriksa-hasil-kerja)

| # | File | Perubahan |
|---|------|-----------|
| 1 | `backend/app/Http/Controllers/Api/V1/PaymentController.php` | Memuat relasi yang masih ada (memperbaiki HTTP 500) |
| 2 | `frontend/src/pages/customer/BookingFlowPage.jsx` | Membaca `room_type` dari respons API (memperbaiki harga `NaN` dan error 422) |
| 3 | `frontend/src/pages/admin/AdminDashboardPage.jsx` | Memakai nama variabel yang sudah dideklarasikan (memperbaiki halaman putih) |
| 4 | `frontend/src/pages/customer/CustomerDashboardPage.jsx` | Hitung mundur pembayaran secara langsung |
| 5 | `frontend/index.html`, `frontend/src/App.jsx` | Judul tab browser untuk setiap halaman |
| 6 | `backend/tests/...` | Test baru untuk status webhook dan endpoint pembayaran |
| 7 | `backend/composer.json` | Pengaturan platform PHP 8.3 |
| 8 | `.gitignore` | Mengabaikan file Claude, file env, dump database, kunci, dan log |
| 9 | `backend/database/seeders/DatabaseSeeder.php` | Harga murah untuk pengujian |

---

## 1. PaymentController: memuat relasi yang masih ada

**File:** `backend/app/Http/Controllers/Api/V1/PaymentController.php`

**Masalah:** `show()` dan `adminIndex()` memuat `booking.service` dan `booking.slot`. Model `Booking` sudah tidak punya relasi itu, karena proyek sekarang memesan kamar hotel. Laravel melempar error `Call to undefined relationship [service] on model [App\Models\Booking]`, dan endpoint mengembalikan HTTP 500. Halaman hasil pembayaran menampilkan "gagal memuat status pembayaran".

**Perubahan:** ganti nama relasi lama dengan `roomType`, `extraItems`, dan `assignedRoom`.

Sebelum (`show`):
```php
$payment = Payment::with(['booking.service', 'booking.slot', 'logs'])->findOrFail($id);
```
Sesudah (`show`):
```php
$payment = Payment::with(['booking.roomType', 'booking.extraItems', 'booking.assignedRoom', 'logs'])->findOrFail($id);
```

Sebelum (`adminIndex`):
```php
$query = Payment::with(['booking.user', 'booking.service']);
```
Sesudah (`adminIndex`):
```php
$query = Payment::with(['booking.user', 'booking.roomType']);
```

Kode lengkap kedua method setelah perubahan:
```php
    /**
     * Get payment details.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $payment = Payment::with(['booking.roomType', 'booking.extraItems', 'booking.assignedRoom', 'logs'])->findOrFail($id);

        if (! $request->user()->isAdmin() && $payment->booking->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $payment,
        ]);
    }

    /**
     * Admin: list all payments.
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = Payment::with(['booking.user', 'booking.roomType']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_id', 'like', "%{$search}%")
                    ->orWhere('transaction_id', 'like', "%{$search}%")
                    ->orWhereHas('booking', function ($b) use ($search) {
                        $b->where('booking_code', 'like', "%{$search}%")
                            ->orWhere('customer_name', 'like', "%{$search}%");
                    });
            });
        }

        $payments = $query->orderBy('id', 'desc')->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $payments,
        ]);
    }
```

---

## 2. BookingFlowPage: membaca `room_type` dari respons

**File:** `frontend/src/pages/customer/BookingFlowPage.jsx` (di dalam fungsi `fetchData`, sekitar baris 70)

**Masalah:** endpoint tipe kamar mengembalikan `{ success, data: { room_type, availability, cost } }`. Halaman menyimpan seluruh objek `data` sebagai kamar. Akibatnya `roomType.id` bernilai `undefined`, dan request `calculate-price` tidak membawa `room_type_id` (HTTP 422). `roomType.base_price_per_night` juga `undefined`, sehingga harga tampil `NaN`.

**Perubahan:** simpan hanya `data.room_type`.

Sebelum:
```jsx
if (roomRes.data) setRoomType(roomRes.data);
```
Sesudah:
```jsx
if (roomRes.data) setRoomType(roomRes.data.room_type);
```

Kode lengkap effect setelah perubahan:
```jsx
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
```

---

## 3. AdminDashboardPage: memakai nama variabel yang sudah dideklarasikan

**File:** `frontend/src/pages/admin/AdminDashboardPage.jsx`

**Masalah:** komponen membaca field snake_case dari API, tetapi JSX memakai nama camelCase yang tidak pernah dideklarasikan. React melempar `ReferenceError: revenueTrend is not defined`, dan halaman menjadi putih.

Variabel dideklarasikan seperti ini (bagian ini sudah benar sejak awal):
```jsx
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
```

**Perubahan:** tiga tempat di JSX sekarang memakai nama yang sudah dideklarasikan.

Baris sekitar 235 (grafik pendapatan):
```jsx
<AreaChart data={revenueTrend}>      // sebelum
<AreaChart data={revenue_trend}>     // sesudah
```

Baris sekitar 278 (cek data kosong):
```jsx
{recentBookings.length === 0 ? (     // sebelum
{recent_bookings.length === 0 ? (    // sesudah
```

Baris sekitar 281 (daftar):
```jsx
recentBookings.map((b) => {          // sebelum
recent_bookings.map((b) => {         // sesudah
```

---

## 4. CustomerDashboardPage: hitung mundur pembayaran

**File:** `frontend/src/pages/customer/CustomerDashboardPage.jsx`

**Masalah:** reservasi yang menunggu pembayaran hanya menampilkan teks tetap, "Batas pembayaran 15 menit". Teks itu tidak menunjukkan sisa waktu yang sebenarnya.

**Perubahan, bagian A:** tambahkan komponen ini di atas `export default function CustomerDashboardPage()`. Komponen membaca `expires_at` dari booking dan menghitung mundur setiap detik. Pada 00:00 komponen menampilkan pesan kedaluwarsa dan memanggil `onExpire`.
```jsx
function PaymentCountdown({ expiresAt, onExpire }) {
  const getRemaining = () =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));

  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    setRemaining(getRemaining());
    const timer = setInterval(() => {
      const next = getRemaining();
      setRemaining(next);
      if (next <= 0) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (remaining <= 0) {
    return (
      <div className="mt-3 p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 text-[11px] text-rose-800 flex items-center space-x-2">
        <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
        <span>Waktu pembayaran habis. Reservasi ini akan kedaluwarsa.</span>
      </div>
    );
  }

  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');

  return (
    <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-800 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
        <span>Sisa waktu pembayaran. Kamar diamankan sementara untuk Anda.</span>
      </div>
      <span className="font-mono text-base font-black text-amber-900 tabular-nums">
        {minutes}:{seconds}
      </span>
    </div>
  );
}
```

**Perubahan, bagian B:** pakai komponen itu di dalam kartu booking. Ganti blok pemberitahuan lama dengan yang baru.

Sebelum:
```jsx
{isPending && (
  <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-800 flex items-center space-x-2">
    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
    <span>Batas pembayaran 15 menit. Kamar diamankan sementara untuk Anda.</span>
  </div>
)}
```

Sesudah:
```jsx
{isPending && b.expires_at && (
  <PaymentCountdown expiresAt={b.expires_at} onExpire={fetchBookings} />
)}
{isPending && !b.expires_at && (
  <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-800 flex items-center space-x-2">
    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
    <span>Batas pembayaran 15 menit. Kamar diamankan sementara untuk Anda.</span>
  </div>
)}
```
Jika `expires_at` tidak ada, teks lama tetap ditampilkan.

`useState` dan `useEffect` sudah diimpor di bagian atas file, dan `XCircle` sudah diimpor dari `lucide-react`.

---

## 5. Judul tab browser untuk setiap halaman

**Masalah:** semua tab browser berjudul "frontend".

**Perubahan, bagian A:** `frontend/index.html`, atur judul bawaan.

Sebelum:
```html
<title>frontend</title>
```
Sesudah:
```html
<title>The Royal Nusantara Resort</title>
```

**Perubahan, bagian B:** `frontend/src/App.jsx`.

1. Ubah import di bagian atas:
```jsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, matchPath } from 'react-router-dom';
```

2. Tambahkan kode ini di atas `export default function App()`. Untuk mengganti judul tab, ubah teks di `PAGE_TITLES`. Untuk halaman baru, tambahkan satu baris.
```jsx
const SITE_NAME = 'The Royal Nusantara';

// Browser tab title for each route. Add new pages here.
const PAGE_TITLES = [
  ['/', 'Beranda'],
  ['/services', 'Kamar & Suite'],
  ['/book/:serviceId', 'Pesan Kamar'],
  ['/payment-result/:paymentId', 'Hasil Pembayaran'],
  ['/login', 'Masuk'],
  ['/register', 'Daftar'],
  ['/customer/dashboard', 'Reservasi Saya'],
  ['/customer/profile', 'Profil Tamu'],
  ['/admin/dashboard', 'Dashboard Admin'],
  ['/admin/rooms', 'Unit Kamar'],
  ['/admin/categories', 'Layanan Tambahan'],
  ['/admin/services', 'Tipe Kamar'],
  ['/admin/schedules', 'Profil Hotel'],
  ['/admin/bookings', 'Front Desk & Reservasi'],
  ['/admin/customers', 'Data Pelanggan'],
  ['/admin/payments', 'Pembayaran'],
  ['/admin/reports', 'Laporan'],
];

function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const match = PAGE_TITLES.find(([path]) => matchPath({ path, end: true }, pathname));
    document.title = match ? `${match[1]} | ${SITE_NAME}` : SITE_NAME;
  }, [pathname]);

  return null;
}
```

3. Letakkan `<DocumentTitle />` di dalam `<BrowserRouter>`, sebelum `<Routes>`:
```jsx
<BrowserRouter>
  <DocumentTitle />
  <Routes>
    {/* ...route yang sudah ada... */}
  </Routes>
</BrowserRouter>
```

---

## 6. Test baru

Jalankan semua test dengan:
```bash
cd backend
php artisan test
```
Test memakai database SQLite sementara di memori, jadi data MySQL Anda tidak tersentuh. Totalnya 28 test.

### 6a. Helper bersama (file baru)

`backend/tests/Concerns/CreatesPendingPayment.php` membuat booking pending beserta pembayaran pending. Helper ini juga membuat payload webhook Midtrans dengan signature yang valid.
```php
<?php

namespace Tests\Concerns;

use App\Models\Booking;
use App\Models\Hotel;
use App\Models\Payment;
use App\Models\RoomType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Str;

/**
 * Shared helpers for payment tests: builds a pending booking with a pending
 * payment, and builds Midtrans-style webhook payloads with a valid signature.
 */
trait CreatesPendingPayment
{
    protected string $serverKey = 'test-server-key-12345';

    protected function createPendingPayment(?User $user = null): Payment
    {
        config(['midtrans.server_key' => $this->serverKey]);

        $user ??= User::factory()->create(['role' => 'customer']);

        $hotel = Hotel::first() ?? Hotel::create([
            'name' => 'The Royal Nusantara Resort',
            'city' => 'Bali',
            'address' => 'Nusa Dua',
            'phone' => '0361-123456',
            'email' => 'info@hotel.com',
            'star_rating' => 5,
        ]);

        $roomType = RoomType::firstOrCreate(
            ['slug' => 'deluxe-suite'],
            [
                'hotel_id' => $hotel->id,
                'name' => 'Deluxe Suite',
                'base_price_per_night' => 1000000,
                'total_rooms' => 5,
                'max_adults' => 2,
                'max_children' => 1,
                'room_size_sqm' => 45,
                'bed_type' => 'King Bed',
                'is_active' => true,
            ]
        );

        $booking = Booking::create([
            'user_id' => $user->id,
            'room_type_id' => $roomType->id,
            'booking_code' => 'HTL-' . strtoupper(Str::random(8)),
            'customer_name' => $user->name,
            'customer_email' => $user->email,
            'customer_phone' => '08123456789',
            'check_in_date' => Carbon::tomorrow()->toDateString(),
            'check_out_date' => Carbon::tomorrow()->addDays(2)->toDateString(),
            'total_nights' => 2,
            'total_adults' => 2,
            'total_children' => 0,
            'room_price_per_night' => 1000000,
            'total_room_amount' => 2000000,
            'total_extras_amount' => 0,
            'tax_and_service_amount' => 200000,
            'total_amount' => 2200000,
            'status' => Booking::STATUS_PENDING_PAYMENT,
        ]);

        return Payment::create([
            'booking_id' => $booking->id,
            'order_id' => 'ORDER-TEST-' . strtoupper(Str::random(8)),
            'gross_amount' => 2200000,
            'status' => Payment::STATUS_PENDING,
        ]);
    }

    /**
     * Build a webhook payload. The signature is valid for the given order id,
     * status code and gross amount unless $signature is passed explicitly.
     */
    protected function webhookPayload(
        string $orderId,
        string $transactionStatus,
        array $overrides = [],
        ?string $signature = null
    ): array {
        $payload = array_merge([
            'order_id' => $orderId,
            'status_code' => '200',
            'gross_amount' => '2200000.00',
            'transaction_status' => $transactionStatus,
            'payment_type' => 'qris',
            'transaction_id' => 'midtrans-trx-' . Str::random(6),
        ], $overrides);

        $payload['signature_key'] = $signature ?? hash(
            'sha512',
            $payload['order_id'] . $payload['status_code'] . $payload['gross_amount'] . $this->serverKey
        );

        return $payload;
    }
}
```

### 6b. Test status webhook (file baru)

`backend/tests/Feature/MidtransWebhookStatusTest.php`
```php
<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingStatusHistory;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesPendingPayment;
use Tests\TestCase;

/**
 * Covers the webhook cases that MidtransWebhookTest does not:
 * pending, deny, expire, cancel, refund, capture, repeated delivery,
 * invalid signature, amount mismatch and unknown order.
 */
class MidtransWebhookStatusTest extends TestCase
{
    use CreatesPendingPayment;
    use RefreshDatabase;

    private const URL = '/api/v1/webhooks/midtrans';

    public function test_pending_notification_keeps_payment_and_booking_pending(): void
    {
        $payment = $this->createPendingPayment();

        $this->postJson(self::URL, $this->webhookPayload($payment->order_id, 'pending'))
            ->assertOk()
            ->assertJsonPath('data.payment_status', Payment::STATUS_PENDING);

        $this->assertSame(Payment::STATUS_PENDING, $payment->fresh()->status);
        $this->assertSame(Booking::STATUS_PENDING_PAYMENT, $payment->booking->fresh()->status);
    }

    public function test_deny_marks_payment_failed_and_keeps_booking_pending_payment(): void
    {
        $payment = $this->createPendingPayment();

        $this->postJson(self::URL, $this->webhookPayload($payment->order_id, 'deny'))->assertOk();

        $this->assertSame(Payment::STATUS_FAILED, $payment->fresh()->status);
        $this->assertSame(Booking::STATUS_PENDING_PAYMENT, $payment->booking->fresh()->status);
    }

    public function test_expire_marks_payment_and_booking_expired(): void
    {
        $payment = $this->createPendingPayment();

        $this->postJson(self::URL, $this->webhookPayload($payment->order_id, 'expire'))->assertOk();

        $this->assertSame(Payment::STATUS_EXPIRED, $payment->fresh()->status);
        $this->assertSame(Booking::STATUS_EXPIRED, $payment->booking->fresh()->status);
    }

    public function test_cancel_marks_payment_and_booking_cancelled(): void
    {
        $payment = $this->createPendingPayment();

        $this->postJson(self::URL, $this->webhookPayload($payment->order_id, 'cancel'))->assertOk();

        $this->assertSame(Payment::STATUS_CANCELLED, $payment->fresh()->status);
        $this->assertSame(Booking::STATUS_CANCELLED, $payment->booking->fresh()->status);
    }

    public function test_refund_marks_payment_refunded(): void
    {
        $payment = $this->createPendingPayment();

        $this->postJson(self::URL, $this->webhookPayload($payment->order_id, 'settlement', [
            'payment_type' => 'bank_transfer',
        ]))->assertOk();

        $this->postJson(self::URL, $this->webhookPayload($payment->order_id, 'refund', [
            'payment_type' => 'bank_transfer',
        ]))->assertOk();

        $this->assertSame(Payment::STATUS_REFUNDED, $payment->fresh()->status);
    }

    public function test_card_capture_with_accept_fraud_status_confirms_booking(): void
    {
        $payment = $this->createPendingPayment();

        $this->postJson(self::URL, $this->webhookPayload($payment->order_id, 'capture', [
            'payment_type' => 'credit_card',
            'fraud_status' => 'accept',
        ]))->assertOk();

        $this->assertSame(Payment::STATUS_PAID, $payment->fresh()->status);
        $this->assertSame(Booking::STATUS_CONFIRMED, $payment->booking->fresh()->status);
    }

    public function test_card_capture_with_challenge_fraud_status_does_not_confirm_booking(): void
    {
        $payment = $this->createPendingPayment();

        $this->postJson(self::URL, $this->webhookPayload($payment->order_id, 'capture', [
            'payment_type' => 'credit_card',
            'fraud_status' => 'challenge',
        ]))->assertOk();

        $this->assertSame(Payment::STATUS_PENDING, $payment->fresh()->status);
        $this->assertSame(Booking::STATUS_PENDING_PAYMENT, $payment->booking->fresh()->status);
    }

    public function test_repeated_settlement_is_idempotent(): void
    {
        $payment = $this->createPendingPayment();
        $payload = $this->webhookPayload($payment->order_id, 'settlement');

        $this->postJson(self::URL, $payload)->assertOk();
        $this->postJson(self::URL, $payload)->assertOk();

        $this->assertSame(Payment::STATUS_PAID, $payment->fresh()->status);
        $this->assertSame(Booking::STATUS_CONFIRMED, $payment->booking->fresh()->status);
        $this->assertSame(
            1,
            BookingStatusHistory::where('booking_id', $payment->booking_id)
                ->where('new_status', Booking::STATUS_CONFIRMED)
                ->count()
        );
    }

    public function test_invalid_signature_is_rejected_and_changes_nothing(): void
    {
        $payment = $this->createPendingPayment();

        $this->postJson(
            self::URL,
            $this->webhookPayload($payment->order_id, 'settlement', [], 'not-the-real-signature')
        )
            ->assertStatus(400)
            ->assertJsonPath('success', false);

        $this->assertSame(Payment::STATUS_PENDING, $payment->fresh()->status);
        $this->assertSame(Booking::STATUS_PENDING_PAYMENT, $payment->booking->fresh()->status);
        $this->assertDatabaseHas('payment_logs', [
            'order_id' => $payment->order_id,
            'processing_result' => 'INVALID_SIGNATURE',
        ]);
    }

    public function test_amount_mismatch_is_rejected_even_with_valid_signature(): void
    {
        $payment = $this->createPendingPayment();

        // Signature is computed over the tampered amount, so only the amount check can stop it.
        $this->postJson(
            self::URL,
            $this->webhookPayload($payment->order_id, 'settlement', ['gross_amount' => '1000.00'])
        )
            ->assertStatus(400)
            ->assertJsonPath('success', false);

        $this->assertSame(Payment::STATUS_PENDING, $payment->fresh()->status);
        $this->assertSame(Booking::STATUS_PENDING_PAYMENT, $payment->booking->fresh()->status);
    }

    public function test_unknown_order_id_is_rejected(): void
    {
        config(['midtrans.server_key' => $this->serverKey]);

        $this->postJson(self::URL, $this->webhookPayload('ORDER-DOES-NOT-EXIST', 'settlement'))
            ->assertStatus(400)
            ->assertJsonPath('success', false);
    }

    public function test_payload_without_order_id_is_rejected(): void
    {
        config(['midtrans.server_key' => $this->serverKey]);

        $this->postJson(self::URL, ['transaction_status' => 'settlement'])
            ->assertStatus(400)
            ->assertJsonPath('success', false);
    }
}
```

### 6c. Test endpoint pembayaran (file baru)

`backend/tests/Feature/PaymentShowTest.php`. Ini adalah regression test untuk perubahan 1. Dengan kode lama `booking.service`, test ini gagal dengan HTTP 500.
```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesPendingPayment;
use Tests\TestCase;

/**
 * GET /api/v1/payments/{id}
 *
 * Regression test: this endpoint used to return 500 because it eager loaded
 * the removed relations "booking.service" and "booking.slot".
 */
class PaymentShowTest extends TestCase
{
    use CreatesPendingPayment;
    use RefreshDatabase;

    private function asUser(User $user): static
    {
        return $this->withHeader('Authorization', 'Bearer ' . $user->createToken('test')->plainTextToken);
    }

    public function test_owner_can_view_payment_with_room_type_and_logs(): void
    {
        $owner = User::factory()->create(['role' => 'customer']);
        $payment = $this->createPendingPayment($owner);

        $this->asUser($owner)
            ->getJson("/api/v1/payments/{$payment->id}")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $payment->id)
            ->assertJsonPath('data.order_id', $payment->order_id)
            ->assertJsonPath('data.booking.booking_code', $payment->booking->booking_code)
            ->assertJsonPath('data.booking.room_type.name', 'Deluxe Suite')
            ->assertJsonStructure(['data' => ['booking' => ['extra_items'], 'logs']]);
    }

    public function test_another_customer_cannot_view_the_payment(): void
    {
        $payment = $this->createPendingPayment(User::factory()->create(['role' => 'customer']));
        $stranger = User::factory()->create(['role' => 'customer']);

        $this->asUser($stranger)
            ->getJson("/api/v1/payments/{$payment->id}")
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_admin_can_view_any_payment(): void
    {
        $payment = $this->createPendingPayment(User::factory()->create(['role' => 'customer']));
        $admin = User::factory()->create(['role' => 'admin']);

        $this->asUser($admin)
            ->getJson("/api/v1/payments/{$payment->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $payment->id);
    }

    public function test_admin_can_list_payments_and_filter_by_status(): void
    {
        $payment = $this->createPendingPayment(User::factory()->create(['role' => 'customer']));
        $admin = User::factory()->create(['role' => 'admin']);

        $this->asUser($admin)
            ->getJson('/api/v1/admin/payments')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.data.0.order_id', $payment->order_id)
            ->assertJsonPath('data.data.0.booking.room_type.name', 'Deluxe Suite');

        $this->asUser($admin)
            ->getJson('/api/v1/admin/payments?status=PAID')
            ->assertOk()
            ->assertJsonCount(0, 'data.data');
    }

    public function test_customer_cannot_list_all_payments(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $this->asUser($customer)->getJson('/api/v1/admin/payments')->assertForbidden();
    }

    public function test_guest_cannot_view_a_payment(): void
    {
        $payment = $this->createPendingPayment();

        $this->getJson("/api/v1/payments/{$payment->id}")->assertUnauthorized();
    }

    public function test_unknown_payment_returns_404(): void
    {
        $user = User::factory()->create(['role' => 'customer']);

        $this->asUser($user)->getJson('/api/v1/payments/999999')->assertNotFound();
    }
}
```

---

## 7. composer.json: platform PHP 8.3

**File:** `backend/composer.json`

**Masalah:** `composer.lock` mengunci Symfony 8.x, yang membutuhkan PHP 8.4.1 atau lebih baru. `composer install` gagal di PHP 8.3.16.

**Perubahan:** jalankan perintah berikut. Perintah ini menambahkan entri `platform` di bawah, dan menulis ulang `composer.lock` dengan paket Symfony 7.4 yang juga didukung Laravel 13.
```bash
cd backend
composer config platform.php 8.3.16
composer update
```
Hasil di dalam `composer.json`:
```json
        "optimize-autoloader": true,
        "preferred-install": "dist",
        "sort-packages": true,
        "allow-plugins": {
            "pestphp/pest-plugin": true,
            "php-http/discovery": true
        },
        "platform": {
            "php": "8.3.16"
        }
    },
    "minimum-stability": "stable",
    "prefer-stable": true
```

---

## 8. .gitignore (file baru di root proyek)

`.gitignore`
```gitignore
# Claude Code (local AI assistant files)
.claude/
CLAUDE.md
CLAUDE.local.md
.mcp.json

# Environment files (secrets). Keep the *.example templates.
.env
.env.*
!.env.example

# Databases and dumps (can contain customer data)
*.sql
*.sqlite
*.sqlite3

# Private keys and certificates
*.pem
*.key
*.p12

# Logs
*.log

# OS files
.DS_Store
Thumbs.db
```
File `.env` diabaikan supaya kunci tidak sampai ke GitHub. File `.env.example` tetap ada di repo sebagai template. Setelah clone, salin file tersebut:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

---

## 9. Harga murah di seeder

**File:** `backend/database/seeders/DatabaseSeeder.php` (tipe kamar "Deluxe Ocean View King Room")

Harga dibuat murah supaya pembayaran sandbox mudah diuji.

Sebelum:
```php
'base_price_per_night' => 850000,
'weekend_price_per_night' => 950000,
```
Sesudah:
```php
'base_price_per_night' => 10000,
'weekend_price_per_night' => 10000,
```
Nilai seeder hanya berlaku saat Anda menjalankan `php artisan migrate --seed` atau `migrate:fresh --seed`. Kamar yang sudah ada di database tetap memakai harga lama.

---

## Cara memeriksa hasil kerja

1. `cd backend && php artisan test` harus menampilkan 28 test lulus.
2. Jalankan kedua server: `php artisan serve` dan, di folder `frontend`, `npm run dev`.
3. Customer: buka "Reservasi Saya". Booking yang menunggu pembayaran menampilkan timer `MM:SS`.
4. Halaman booking: harga tampil sebagai angka, bukan `NaN`.
5. Admin: halaman Dashboard dan Payments terbuka tanpa layar putih.
6. Setiap tab browser menampilkan nama halaman diikuti "The Royal Nusantara".
