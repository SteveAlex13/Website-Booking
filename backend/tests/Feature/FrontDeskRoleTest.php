<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Hotel;
use App\Models\Room;
use App\Models\RoomType;
use App\Models\User;
use App\Services\HotelBookingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Front desk = users.role 'admin'. Super admin = 'super_admin'.
 * Front desk handles daily operations (bookings, check-in/out, room status, guest book)
 * but not money, coupons, catalog or cancellation.
 */
class FrontDeskRoleTest extends TestCase
{
    use RefreshDatabase;

    protected User $staff;
    protected User $superAdmin;
    protected User $customer;
    protected RoomType $roomType;
    protected RoomType $otherRoomType;
    protected Room $room;
    protected int $dayOffset = 5;

    protected function setUp(): void
    {
        parent::setUp();

        $this->staff = User::factory()->create(['role' => 'admin']);
        $this->superAdmin = User::factory()->create(['role' => 'super_admin']);
        $this->customer = User::factory()->create(['role' => 'customer']);

        $hotel = Hotel::create([
            'name' => 'Royal Resort Bali',
            'star_rating' => 5,
            'address' => 'Jl. Pantai Kuta',
            'city' => 'Bali',
            'phone' => '0361-12345',
            'email' => 'info@royal.com',
        ]);

        $this->roomType = $this->makeRoomType($hotel, 'Deluxe King', 'deluxe-king');
        $this->otherRoomType = $this->makeRoomType($hotel, 'Suite', 'suite');

        $this->room = Room::create([
            'room_type_id' => $this->roomType->id,
            'room_number' => '101',
            'floor' => 1,
            'status' => 'available',
        ]);
    }

    private function makeRoomType(Hotel $hotel, string $name, string $slug): RoomType
    {
        return RoomType::create([
            'hotel_id' => $hotel->id,
            'name' => $name,
            'slug' => $slug,
            'base_price_per_night' => 500000,
            'max_adults' => 2,
            'max_children' => 1,
            'room_size_sqm' => 35,
            'bed_type' => '1 King Bed',
            'total_rooms' => 3,
            'is_active' => true,
        ]);
    }

    /**
     * Create a booking for the customer. Cash bookings are CONFIRMED right away,
     * Midtrans bookings stay PENDING_PAYMENT.
     */
    private function makeBooking(string $paymentMethod = 'cash', bool $startsToday = false): Booking
    {
        $this->dayOffset += 3;
        $start = $startsToday ? 0 : $this->dayOffset;

        return app(HotelBookingService::class)->createBooking($this->customer, [
            'room_type_id' => $this->roomType->id,
            'check_in_date' => Carbon::today()->addDays($start)->toDateString(),
            'check_out_date' => Carbon::today()->addDays($start + 2)->toDateString(),
            'total_adults' => 2,
            'payment_method' => $paymentMethod,
        ]);
    }

    public function test_front_desk_can_use_daily_operations_routes(): void
    {
        $booking = $this->makeBooking();

        $this->actingAs($this->staff);

        $this->getJson('/api/v1/admin/dashboard')->assertOk();
        $this->getJson('/api/v1/admin/bookings')->assertOk();
        $this->getJson("/api/v1/admin/bookings/{$booking->id}")->assertOk();
        $this->getJson("/api/v1/admin/bookings/{$booking->id}/available-rooms")->assertOk();
        $this->getJson('/api/v1/admin/customers')->assertOk();
        $this->getJson('/api/v1/admin/rooms')->assertOk();
        $this->getJson('/api/v1/admin/room-types')->assertOk();
        $this->patchJson("/api/v1/admin/rooms/{$this->room->id}/status", ['status' => 'cleaning'])
            ->assertOk();

        $this->assertSame('cleaning', $this->room->fresh()->status);
    }

    public function test_front_desk_can_check_in_and_check_out_a_confirmed_booking(): void
    {
        $booking = $this->makeBooking('cash', true);

        $this->actingAs($this->staff)
            ->postJson("/api/v1/admin/bookings/{$booking->id}/check-in", ['room_id' => $this->room->id])
            ->assertOk()
            ->assertJsonPath('data.status', Booking::STATUS_CHECKED_IN);

        $this->assertSame('occupied', $this->room->fresh()->status);

        $this->actingAs($this->staff)
            ->postJson("/api/v1/admin/bookings/{$booking->id}/check-out")
            ->assertOk()
            ->assertJsonPath('data.status', Booking::STATUS_CHECKED_OUT);

        $this->assertSame('cleaning', $this->room->fresh()->status);
    }

    public function test_front_desk_dashboard_hides_revenue_but_super_admin_sees_it(): void
    {
        $this->actingAs($this->staff)
            ->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonStructure(['data' => ['occupancy_rate', 'recent_bookings', 'status_breakdown']])
            ->assertJsonMissingPath('data.total_revenue')
            ->assertJsonMissingPath('data.revenue_trend')
            ->assertJsonMissingPath('data.recent_payments');

        $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonStructure(['data' => ['total_revenue', 'revenue_trend', 'recent_payments']]);
    }

    public function test_front_desk_is_blocked_from_super_admin_routes(): void
    {
        $blocked = [
            ['GET', 'reports'],
            ['GET', 'payments'],
            ['GET', 'coupons'],
            ['POST', 'coupons'],
            ['PUT', 'coupons/1'],
            ['PATCH', 'coupons/1/toggle'],
            ['DELETE', 'coupons/1'],
            ['PUT', 'hotel'],
            ['POST', 'extra-services'],
            ['PUT', 'extra-services/1'],
            ['DELETE', 'extra-services/1'],
            ['POST', 'amenities'],
            ['DELETE', 'amenities/1'],
            ['POST', 'room-types'],
            ['PUT', 'room-types/1'],
            ['DELETE', 'room-types/1'],
            ['POST', 'services'],
            ['PUT', 'services/1'],
            ['DELETE', 'services/1'],
            ['POST', 'rooms'],
            ['DELETE', 'rooms/1'],
            ['POST', 'bookings/1/cancel'],
        ];

        $this->actingAs($this->staff);

        foreach ($blocked as [$method, $uri]) {
            $response = $this->json($method, "/api/v1/admin/{$uri}");

            $this->assertSame(
                403,
                $response->getStatusCode(),
                "Front desk should get 403 on {$method} /admin/{$uri}"
            );
        }
    }

    public function test_super_admin_still_reaches_restricted_routes(): void
    {
        $this->actingAs($this->superAdmin);

        $this->getJson('/api/v1/admin/reports')->assertOk();
        $this->getJson('/api/v1/admin/payments')->assertOk();
        $this->getJson('/api/v1/admin/coupons')->assertOk();
    }

    public function test_customer_is_blocked_from_all_admin_routes(): void
    {
        $this->actingAs($this->customer);

        $this->getJson('/api/v1/admin/customers')->assertForbidden();
        $this->getJson('/api/v1/admin/rooms')->assertForbidden();
        $this->patchJson("/api/v1/admin/rooms/{$this->room->id}/status", ['status' => 'cleaning'])->assertForbidden();
    }

    public function test_front_desk_cannot_cancel_a_guest_booking_through_the_customer_route(): void
    {
        $booking = $this->makeBooking('midtrans');

        $this->actingAs($this->staff)
            ->postJson("/api/v1/bookings/{$booking->id}/cancel", ['reason' => 'staff attempt'])
            ->assertForbidden();

        $this->assertSame(Booking::STATUS_PENDING_PAYMENT, $booking->fresh()->status);

        $this->actingAs($this->customer)
            ->postJson("/api/v1/bookings/{$booking->id}/cancel", ['reason' => 'changed plans'])
            ->assertOk();

        $this->assertSame(Booking::STATUS_CANCELLED, $booking->fresh()->status);
    }

    public function test_only_customers_can_book_a_room(): void
    {
        $payload = [
            'room_type_id' => $this->roomType->id,
            'check_in_date' => Carbon::today()->addDays(30)->toDateString(),
            'check_out_date' => Carbon::today()->addDays(32)->toDateString(),
            'total_adults' => 2,
            'payment_method' => 'cash',
        ];

        foreach ([$this->staff, $this->superAdmin] as $staffUser) {
            $this->actingAs($staffUser)
                ->postJson('/api/v1/bookings', $payload)
                ->assertForbidden()
                ->assertJsonPath('success', false);
        }

        $this->assertSame(0, Booking::count());

        $this->actingAs($this->customer)
            ->postJson('/api/v1/bookings', $payload)
            ->assertSuccessful();

        $this->assertSame(1, Booking::count());
    }

    public function test_guest_without_login_cannot_book_a_room(): void
    {
        $this->postJson('/api/v1/bookings', [
            'room_type_id' => $this->roomType->id,
            'check_in_date' => Carbon::today()->addDays(30)->toDateString(),
            'check_out_date' => Carbon::today()->addDays(32)->toDateString(),
            'total_adults' => 2,
        ])->assertUnauthorized();
    }

    public function test_staff_cannot_start_a_payment_for_a_guest_booking(): void
    {
        $booking = $this->makeBooking('midtrans');

        $this->actingAs($this->staff)
            ->postJson('/api/v1/payments/checkout', ['booking_id' => $booking->id])
            ->assertForbidden();

        $this->actingAs($this->superAdmin)
            ->postJson('/api/v1/payments/checkout', ['booking_id' => $booking->id])
            ->assertForbidden();
    }

    public function test_check_in_requires_a_confirmed_booking(): void
    {
        $pending = $this->makeBooking('midtrans');

        $this->actingAs($this->staff)
            ->postJson("/api/v1/admin/bookings/{$pending->id}/check-in", ['room_id' => $this->room->id])
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertSame(Booking::STATUS_PENDING_PAYMENT, $pending->fresh()->status);
        $this->assertSame('available', $this->room->fresh()->status);
    }

    public function test_check_in_rejects_a_room_of_another_room_type(): void
    {
        $booking = $this->makeBooking('cash', true);
        $otherRoom = Room::create([
            'room_type_id' => $this->otherRoomType->id,
            'room_number' => '201',
            'floor' => 2,
            'status' => 'available',
        ]);

        $this->actingAs($this->staff)
            ->postJson("/api/v1/admin/bookings/{$booking->id}/check-in", ['room_id' => $otherRoom->id])
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertSame(Booking::STATUS_CONFIRMED, $booking->fresh()->status);
        $this->assertSame('available', $otherRoom->fresh()->status);
    }

    public function test_check_out_requires_a_checked_in_booking(): void
    {
        $booking = $this->makeBooking();

        $this->actingAs($this->staff)
            ->postJson("/api/v1/admin/bookings/{$booking->id}/check-out")
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertSame(Booking::STATUS_CONFIRMED, $booking->fresh()->status);
    }

    public function test_guest_book_is_read_only_and_searchable(): void
    {
        User::factory()->create(['role' => 'customer', 'name' => 'Budi Santoso', 'email' => 'budi@example.com']);

        $this->actingAs($this->staff)
            ->getJson('/api/v1/admin/customers?search=budi')
            ->assertOk()
            ->assertJsonPath('data.total', 1);

        $this->actingAs($this->staff)
            ->getJson('/api/v1/admin/customers?search=tidak-ada-orang-ini')
            ->assertOk()
            ->assertJsonPath('data.total', 0);

        // There is no write endpoint for guests.
        $this->actingAs($this->staff)->postJson('/api/v1/admin/customers', ['name' => 'X'])->assertStatus(405);
        $this->actingAs($this->staff)->deleteJson('/api/v1/admin/customers/1')->assertStatus(404);
    }
}
