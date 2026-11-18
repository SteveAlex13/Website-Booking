<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\DiscountCoupon;
use App\Models\Hotel;
use App\Models\RoomType;
use App\Models\User;
use App\Services\HotelBookingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingEngineTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected Hotel $hotel;
    protected RoomType $roomType;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create(['role' => 'customer']);

        $this->hotel = Hotel::create([
            'name' => 'Royal Resort Bali',
            'star_rating' => 5,
            'address' => 'Jl. Pantai Kuta',
            'city' => 'Bali',
            'phone' => '0361-12345',
            'email' => 'info@royal.com',
        ]);

        $this->roomType = RoomType::create([
            'hotel_id' => $this->hotel->id,
            'name' => 'Deluxe King',
            'slug' => 'deluxe-king',
            'base_price_per_night' => 500000,
            'max_adults' => 2,
            'max_children' => 1,
            'room_size_sqm' => 35,
            'bed_type' => '1 King Bed',
            'total_rooms' => 1, // Only 1 physical room exists for strict concurrency testing!
            'is_active' => true,
        ]);
    }

    public function test_hotel_booking_calculates_nights_and_taxes_accurately(): void
    {
        $token = $this->customer->createToken('test')->plainTextToken;

        $checkIn = Carbon::today()->addDays(5)->toDateString();
        $checkOut = Carbon::today()->addDays(7)->toDateString(); // 2 nights

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/bookings', [
                'room_type_id' => $this->roomType->id,
                'check_in_date' => $checkIn,
                'check_out_date' => $checkOut,
                'total_adults' => 2,
                'customer_name' => 'Budi Santoso',
                'customer_email' => 'budi@example.com',
                'customer_phone' => '0812345678',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_nights', 2)
            ->assertJsonPath('data.total_room_amount', '1000000.00') // 500k x 2 nights
            ->assertJsonPath('data.tax_and_service_amount', '100000.00') // 10% tax
            ->assertJsonPath('data.total_amount', '1100000.00') // 1M + 100k
            ->assertJsonPath('data.status', 'PENDING_PAYMENT');

        $this->assertDatabaseHas('bookings', [
            'room_type_id' => $this->roomType->id,
            'total_nights' => 2,
        ]);
    }

    public function test_overbooking_on_same_dates_is_rejected(): void
    {
        $bookingService = app(HotelBookingService::class);
        $checkIn = Carbon::today()->addDays(5)->toDateString();
        $checkOut = Carbon::today()->addDays(7)->toDateString();

        // First customer books the only available room
        $bookingService->createBooking($this->customer, [
            'room_type_id' => $this->roomType->id,
            'check_in_date' => $checkIn,
            'check_out_date' => $checkOut,
            'total_adults' => 2,
        ]);

        // Second customer tries to book overlapping stay -> MUST FAIL
        $anotherCustomer = User::factory()->create(['role' => 'customer']);
        $token = $anotherCustomer->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/bookings', [
                'room_type_id' => $this->roomType->id,
                'check_in_date' => $checkIn,
                'check_out_date' => $checkOut,
                'total_adults' => 1,
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error_code', 'ROOM_ALREADY_BOOKED')
            ->assertJsonPath('message', 'Mohon maaf kamar sudah dibooking orang lain dan sudah tidak tersedia.');
    }

    public function test_expired_booking_releases_room_inventory(): void
    {
        $bookingService = app(HotelBookingService::class);
        $checkIn = Carbon::today()->addDays(5)->toDateString();
        $checkOut = Carbon::today()->addDays(7)->toDateString();

        $booking = $bookingService->createBooking($this->customer, [
            'room_type_id' => $this->roomType->id,
            'check_in_date' => $checkIn,
            'check_out_date' => $checkOut,
            'total_adults' => 2,
        ]);

        $this->assertEquals(Booking::STATUS_PENDING_PAYMENT, $booking->status);

        // Expire booking
        $bookingService->expireBooking($booking);
        $booking->refresh();

        $this->assertEquals(Booking::STATUS_EXPIRED, $booking->status);

        // Now another customer CAN book those dates since inventory is released!
        $anotherCustomer = User::factory()->create(['role' => 'customer']);
        $newBooking = $bookingService->createBooking($anotherCustomer, [
            'room_type_id' => $this->roomType->id,
            'check_in_date' => $checkIn,
            'check_out_date' => $checkOut,
            'total_adults' => 1,
        ]);

        $this->assertNotNull($newBooking->id);
    }

    public function test_admin_cancel_requires_valid_superadmin_cancellation_key(): void
    {
        $superAdmin = User::factory()->create([
            'role' => 'super_admin',
            'cancellation_key' => 'TEST-SECRET-KEY-999',
        ]);
        $staffAdmin = User::factory()->create(['role' => 'admin']);

        $bookingService = app(HotelBookingService::class);
        $checkIn = Carbon::today()->addDays(10)->toDateString();
        $checkOut = Carbon::today()->addDays(12)->toDateString();

        $booking = $bookingService->createBooking($this->customer, [
            'room_type_id' => $this->roomType->id,
            'check_in_date' => $checkIn,
            'check_out_date' => $checkOut,
            'total_adults' => 2,
        ]);

        // 0. Front desk (role admin) cannot cancel at all, even with a valid key -> 403
        $this->actingAs($staffAdmin)
            ->postJson("/api/v1/admin/bookings/{$booking->id}/cancel", [
                'cancellation_key' => 'TEST-SECRET-KEY-999',
                'reason' => 'Guest requested cancel',
            ])
            ->assertStatus(403);

        $booking->refresh();
        $this->assertEquals(Booking::STATUS_PENDING_PAYMENT, $booking->status);

        // 1. Super admin with an invalid key -> 403 Forbidden
        $response = $this->actingAs($superAdmin)
            ->postJson("/api/v1/admin/bookings/{$booking->id}/cancel", [
                'cancellation_key' => 'WRONG-KEY-000',
                'reason' => 'Guest emergency',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('success', false);

        $booking->refresh();
        $this->assertEquals(Booking::STATUS_PENDING_PAYMENT, $booking->status);

        // 2. Super admin with the valid key -> 200 OK
        $responseSuccess = $this->actingAs($superAdmin)
            ->postJson("/api/v1/admin/bookings/{$booking->id}/cancel", [
                'cancellation_key' => 'TEST-SECRET-KEY-999',
                'reason' => 'Guest requested cancel',
            ]);

        $responseSuccess->assertStatus(200)
            ->assertJsonPath('success', true);

        $booking->refresh();
        $this->assertEquals(Booking::STATUS_CANCELLED, $booking->status);
        $this->assertNotNull($booking->cancelled_at);
    }

    public function test_coupon_validation_and_discount_calculation(): void
    {
        DiscountCoupon::create([
            'code' => 'TEST10',
            'name' => 'Diskon Uji Coba 10%',
            'type' => 'percentage',
            'value' => 10,
            'min_spend' => 100000,
            'is_active' => true,
        ]);

        $checkIn = Carbon::today()->addDays(5)->toDateString();
        $checkOut = Carbon::today()->addDays(7)->toDateString(); // 2 nights x 500.000 = 1.000.000

        // 1. Calculate price with coupon
        $calcRes = $this->postJson('/api/v1/bookings/calculate-price', [
            'room_type_id' => $this->roomType->id,
            'check_in_date' => $checkIn,
            'check_out_date' => $checkOut,
            'coupon_code' => 'TEST10',
        ]);

        $calcRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.subtotal', 1000000)
            ->assertJsonPath('data.discount_amount', 100000)
            ->assertJsonPath('data.taxable_amount', 900000)
            ->assertJsonPath('data.tax_and_service', 90000)
            ->assertJsonPath('data.grand_total', 990000);

        // 2. Create booking with coupon
        $token = $this->customer->createToken('test')->plainTextToken;
        $bookingRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/bookings', [
                'room_type_id' => $this->roomType->id,
                'check_in_date' => $checkIn,
                'check_out_date' => $checkOut,
                'total_adults' => 2,
                'coupon_code' => 'TEST10',
            ]);

        $bookingRes->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.discount_code', 'TEST10')
            ->assertJsonPath('data.discount_amount', '100000.00')
            ->assertJsonPath('data.total_amount', '990000.00');
    }

    public function test_hotel_booking_with_cash_payment_and_front_desk_settlement(): void
    {
        $token = $this->customer->createToken('test')->plainTextToken;

        // The guest arrives today, so the front desk is allowed to check them in
        $checkIn = Carbon::today()->toDateString();
        $checkOut = Carbon::today()->addDays(1)->toDateString();

        // 1. Create cash booking
        $bookingRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/bookings', [
                'room_type_id' => $this->roomType->id,
                'check_in_date' => $checkIn,
                'check_out_date' => $checkOut,
                'total_adults' => 2,
                'payment_method' => 'cash',
            ]);

        $bookingRes->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_method', 'cash')
            ->assertJsonPath('data.status', Booking::STATUS_CONFIRMED);

        $bookingId = $bookingRes->json('data.id');
        $booking = Booking::with('latestPayment')->find($bookingId);
        $this->assertNotNull($booking->latestPayment);
        $this->assertEquals('cash', $booking->latestPayment->payment_type);
        $this->assertEquals('PENDING', $booking->latestPayment->status);

        // 2. Customer can fetch payment details on result page
        $paymentRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/v1/payments/{$booking->latestPayment->id}");

        $paymentRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment_type', 'cash');

        // 3. Admin checks guest in and assigns room - cash payment automatically settles to PAID
        $admin = User::factory()->create(['role' => 'admin']);
        $adminToken = $admin->createToken('admin')->plainTextToken;

        $room = \App\Models\Room::create([
            'room_type_id' => $this->roomType->id,
            'room_number' => '101',
            'floor' => 1,
            'status' => 'available',
        ]);

        $checkInRes = $this->actingAs($admin)
            ->postJson("/api/v1/admin/bookings/{$bookingId}/check-in", [
                'room_id' => $room->id,
            ]);

        $checkInRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', Booking::STATUS_CHECKED_IN);

        $booking->latestPayment->refresh();
        $this->assertEquals('PAID', $booking->latestPayment->status);
        $this->assertEquals('settled_at_front_desk', $booking->latestPayment->provider_status);

        // Room status becomes occupied after check-in
        $room->refresh();
        $this->assertEquals('occupied', $room->status);

        // 4. Admin checks guest out - room status automatically changes to 'cleaning'
        $checkOutRes = $this->actingAs($admin)
            ->postJson("/api/v1/admin/bookings/{$bookingId}/check-out");

        $checkOutRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', Booking::STATUS_CHECKED_OUT);

        $room->refresh();
        $this->assertEquals('cleaning', $room->status);
    }

    public function test_late_payment_arrival_when_room_filled_is_marked_paid_no_slot(): void
    {
        $bookingService = app(HotelBookingService::class);
        $paymentService = app(\App\Services\PaymentService::class);

        $checkIn = Carbon::today()->addDays(20)->toDateString();
        $checkOut = Carbon::today()->addDays(22)->toDateString();

        // 1. Customer A creates booking for the 1 available room
        $bookingA = $bookingService->createBooking($this->customer, [
            'room_type_id' => $this->roomType->id,
            'check_in_date' => $checkIn,
            'check_out_date' => $checkOut,
            'total_adults' => 1,
        ]);

        $checkoutA = $paymentService->createCheckout($bookingA);
        $orderIdA = $checkoutA['order_id'];

        // 2. Booking A expires
        $bookingService->expireBooking($bookingA);
        $bookingA->refresh();
        $this->assertEquals(Booking::STATUS_EXPIRED, $bookingA->status);

        // 3. Customer B books the newly released slot and confirms it
        $customerB = User::factory()->create(['role' => 'customer']);
        $bookingB = $bookingService->createBooking($customerB, [
            'room_type_id' => $this->roomType->id,
            'check_in_date' => $checkIn,
            'check_out_date' => $checkOut,
            'total_adults' => 1,
            'payment_method' => 'cash',
        ]);
        $this->assertEquals(Booking::STATUS_CONFIRMED, $bookingB->status);

        // 4. Webhook settlement for Customer A arrives late (room is now full)
        $paymentService->handleWebhook([
            'order_id' => $orderIdA,
            'status_code' => '200',
            'gross_amount' => (string) $bookingA->total_amount,
            'signature_key' => 'SIMULATED_SIGNATURE',
            'transaction_status' => 'settlement',
            'payment_type' => 'gopay',
            'transaction_id' => 'MIDTRANS-LATE-123',
        ], true);

        // 5. Section 7: Booking A must be marked PAID_NO_SLOT for refund, not double booked!
        $bookingA->refresh();
        $this->assertEquals(Booking::STATUS_PAID_NO_SLOT, $bookingA->status);

        $paymentA = \App\Models\Payment::where('order_id', $orderIdA)->first();
        $this->assertEquals('PAID_NO_SLOT', $paymentA->status);
    }
}
