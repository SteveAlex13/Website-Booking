<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Hotel;
use App\Models\Payment;
use App\Models\RoomType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinancialReportTest extends TestCase
{
    use RefreshDatabase;

    protected Hotel $hotel;

    protected function setUp(): void
    {
        parent::setUp();

        $this->hotel = Hotel::create([
            'name' => 'The Royal Nusantara Resort',
            'city' => 'Denpasar',
            'state' => 'Bali',
            'country' => 'Indonesia',
            'address' => 'Jl. Danau Tamblingan No. 88, Sanur',
            'phone' => '0361-288999',
            'email' => 'reservation@royalnusantara.com',
            'is_active' => true,
        ]);
    }

    public function test_super_admin_can_view_financial_report_with_payment_channels_breakdown(): void
    {
        $superAdmin = User::factory()->create(['role' => 'super_admin']);
        $customer = User::factory()->create(['role' => 'customer']);

        $roomType = RoomType::create([
            'hotel_id' => $this->hotel->id,
            'name' => 'Deluxe Suite',
            'slug' => 'deluxe-suite',
            'base_price_per_night' => 500000,
            'max_occupancy' => 2,
            'is_active' => true,
        ]);

        $today = Carbon::today();

        // 1. Cash booking payment
        $booking1 = Booking::create([
            'booking_code' => 'BOOK-CASH-001',
            'user_id' => $customer->id,
            'room_type_id' => $roomType->id,
            'customer_name' => 'Customer Cash',
            'customer_email' => 'cash@test.com',
            'customer_phone' => '08123456789',
            'check_in_date' => $today->toDateString(),
            'check_out_date' => $today->copy()->addDay()->toDateString(),
            'total_nights' => 1,
            'total_adults' => 1,
            'room_price_per_night' => 500000,
            'total_room_amount' => 500000,
            'total_extras_amount' => 0,
            'tax_and_service_amount' => 0,
            'total_amount' => 500000,
            'payment_method' => 'cash',
            'status' => Booking::STATUS_CHECKED_IN,
        ]);

        Payment::create([
            'booking_id' => $booking1->id,
            'order_id' => 'CASH-BOOK-CASH-001',
            'payment_type' => 'cash',
            'gross_amount' => 500000,
            'status' => Payment::STATUS_PAID,
            'provider_status' => 'settled_at_front_desk',
            'paid_at' => $today->copy()->setHour(10),
        ]);

        // 2. QRIS BCA EDC payment
        $bookingQris = Booking::create([
            'booking_code' => 'BOOK-QRIS-002',
            'user_id' => $customer->id,
            'room_type_id' => $roomType->id,
            'customer_name' => 'Customer QRIS',
            'customer_email' => 'qris@test.com',
            'customer_phone' => '08123456789',
            'check_in_date' => $today->toDateString(),
            'check_out_date' => $today->copy()->addDay()->toDateString(),
            'total_nights' => 1,
            'total_adults' => 1,
            'room_price_per_night' => 600000,
            'total_room_amount' => 600000,
            'total_extras_amount' => 0,
            'tax_and_service_amount' => 0,
            'total_amount' => 600000,
            'payment_method' => 'cash',
            'status' => Booking::STATUS_CHECKED_IN,
        ]);

        Payment::create([
            'booking_id' => $bookingQris->id,
            'order_id' => 'CASH-BOOK-QRIS-002',
            'payment_type' => 'qris_bca',
            'transaction_id' => 'QRIS-BCA-998877',
            'gross_amount' => 600000,
            'status' => Payment::STATUS_PAID,
            'provider_status' => 'settled_at_front_desk',
            'paid_at' => $today->copy()->setTime(10, 30),
        ]);

        // 3. Debit BCA payment
        $booking2 = Booking::create([
            'booking_code' => 'BOOK-DEBIT-002',
            'user_id' => $customer->id,
            'room_type_id' => $roomType->id,
            'customer_name' => 'Customer Debit',
            'customer_email' => 'debit@test.com',
            'customer_phone' => '08123456789',
            'check_in_date' => $today->toDateString(),
            'check_out_date' => $today->copy()->addDay()->toDateString(),
            'total_nights' => 1,
            'total_adults' => 1,
            'room_price_per_night' => 750000,
            'total_room_amount' => 750000,
            'total_extras_amount' => 0,
            'tax_and_service_amount' => 0,
            'total_amount' => 750000,
            'payment_method' => 'cash',
            'status' => Booking::STATUS_CHECKED_IN,
        ]);

        Payment::create([
            'booking_id' => $booking2->id,
            'order_id' => 'CASH-BOOK-DEBIT-002',
            'payment_type' => 'debit_bca',
            'transaction_id' => 'EDC-BCA-123456',
            'gross_amount' => 750000,
            'status' => Payment::STATUS_PAID,
            'provider_status' => 'settled_at_front_desk',
            'paid_at' => $today->copy()->setHour(11),
        ]);

        // 3. Credit Card Mandiri payment
        $booking3 = Booking::create([
            'booking_code' => 'BOOK-CC-003',
            'user_id' => $customer->id,
            'room_type_id' => $roomType->id,
            'customer_name' => 'Customer Credit',
            'customer_email' => 'credit@test.com',
            'customer_phone' => '08123456789',
            'check_in_date' => $today->toDateString(),
            'check_out_date' => $today->copy()->addDay()->toDateString(),
            'total_nights' => 1,
            'total_adults' => 1,
            'room_price_per_night' => 1000000,
            'total_room_amount' => 1000000,
            'total_extras_amount' => 0,
            'tax_and_service_amount' => 0,
            'total_amount' => 1000000,
            'payment_method' => 'cash',
            'status' => Booking::STATUS_CHECKED_IN,
        ]);

        Payment::create([
            'booking_id' => $booking3->id,
            'order_id' => 'CASH-BOOK-CC-003',
            'payment_type' => 'credit_mandiri',
            'transaction_id' => 'EDC-MANDIRI-654321',
            'gross_amount' => 1000000,
            'status' => Payment::STATUS_PAID,
            'provider_status' => 'settled_at_front_desk',
            'paid_at' => $today->copy()->setHour(12),
        ]);

        // 4. Online Midtrans payment
        $booking4 = Booking::create([
            'booking_code' => 'BOOK-MIDTRANS-004',
            'user_id' => $customer->id,
            'room_type_id' => $roomType->id,
            'customer_name' => 'Customer Midtrans',
            'customer_email' => 'midtrans@test.com',
            'customer_phone' => '08123456789',
            'check_in_date' => $today->toDateString(),
            'check_out_date' => $today->copy()->addDay()->toDateString(),
            'total_nights' => 1,
            'total_adults' => 1,
            'room_price_per_night' => 1250000,
            'total_room_amount' => 1250000,
            'total_extras_amount' => 0,
            'tax_and_service_amount' => 0,
            'total_amount' => 1250000,
            'payment_method' => 'midtrans',
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        Payment::create([
            'booking_id' => $booking4->id,
            'order_id' => 'MIDTRANS-BOOK-004',
            'payment_type' => 'gopay',
            'transaction_id' => 'MIDTRANS-TX-9988',
            'gross_amount' => 1250000,
            'status' => Payment::STATUS_PAID,
            'provider_status' => 'settlement',
            'paid_at' => $today->copy()->setHour(13),
        ]);

        $startStr = Carbon::today()->startOfMonth()->toDateString();
        $endStr = Carbon::today()->toDateString();

        // Request financial reports
        $response = $this->actingAs($superAdmin)
            ->getJson("/api/v1/admin/reports?start_date={$startStr}&end_date={$endStr}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_revenue', 4100000)
            ->assertJsonPath('data.payment_channels.cash.total_amount', 500000)
            ->assertJsonPath('data.payment_channels.cash.count', 1)
            ->assertJsonPath('data.payment_channels.qris.total_amount', 600000)
            ->assertJsonPath('data.payment_channels.qris.banks.bca', 600000)
            ->assertJsonPath('data.payment_channels.qris.count', 1)
            ->assertJsonPath('data.payment_channels.debit_card.total_amount', 750000)
            ->assertJsonPath('data.payment_channels.debit_card.banks.bca', 750000)
            ->assertJsonPath('data.payment_channels.credit_card.total_amount', 1000000)
            ->assertJsonPath('data.payment_channels.credit_card.banks.mandiri', 1000000)
            ->assertJsonPath('data.payment_channels.midtrans.total_amount', 1250000)
            ->assertJsonPath('data.payment_channels.midtrans.count', 1);
    }

    public function test_front_desk_staff_cannot_access_financial_reports(): void
    {
        $frontDeskStaff = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($frontDeskStaff)
            ->getJson('/api/v1/admin/reports');

        $response->assertStatus(403);
    }
}
