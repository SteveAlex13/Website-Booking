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

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
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

        // 1. Attempt cancel with invalid key -> 403 Forbidden
        $response = $this->actingAs($staffAdmin)
            ->postJson("/api/v1/admin/bookings/{$booking->id}/cancel", [
                'cancellation_key' => 'WRONG-KEY-000',
                'reason' => 'Guest emergency',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('success', false);

        $booking->refresh();
        $this->assertEquals(Booking::STATUS_PENDING_PAYMENT, $booking->status);

        // 2. Attempt cancel with valid Super Admin key -> 200 OK
        $responseSuccess = $this->actingAs($staffAdmin)
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
}
