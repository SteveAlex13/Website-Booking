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
 * Core room and check-in rules: stay dates, maintenance stock, occupied rooms,
 * cancelling checked-in guests, and guest capacity.
 */
class RoomRulesTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected User $staff;
    protected User $superAdmin;
    protected RoomType $roomType;
    protected Room $room;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create(['role' => 'customer']);
        $this->staff = User::factory()->create(['role' => 'admin']);
        $this->superAdmin = User::factory()->create(['role' => 'super_admin', 'cancellation_key' => 'KEY-123']);

        $hotel = Hotel::create([
            'name' => 'Royal Resort Bali',
            'star_rating' => 5,
            'address' => 'Jl. Pantai Kuta',
            'city' => 'Bali',
            'phone' => '0361-12345',
            'email' => 'info@royal.com',
        ]);

        $this->roomType = RoomType::create([
            'hotel_id' => $hotel->id,
            'name' => 'Deluxe King',
            'slug' => 'deluxe-king',
            'base_price_per_night' => 500000,
            'max_adults' => 2,
            'max_children' => 1,
            'room_size_sqm' => 35,
            'bed_type' => '1 King Bed',
            'total_rooms' => 2,
            'is_active' => true,
        ]);

        $this->room = Room::create([
            'room_type_id' => $this->roomType->id,
            'room_number' => '101',
            'floor' => 1,
            'status' => 'available',
        ]);
        Room::create([
            'room_type_id' => $this->roomType->id,
            'room_number' => '102',
            'floor' => 1,
            'status' => 'available',
        ]);
    }

    private function book(int $startInDays = 0, int $nights = 1, array $override = [], string $method = 'cash'): Booking
    {
        return app(HotelBookingService::class)->createBooking($this->customer, array_merge([
            'room_type_id' => $this->roomType->id,
            'check_in_date' => Carbon::today()->addDays($startInDays)->toDateString(),
            'check_out_date' => Carbon::today()->addDays($startInDays + $nights)->toDateString(),
            'total_adults' => 2,
            'payment_method' => $method,
        ], $override));
    }

    private function checkIn(Booking $booking)
    {
        return $this->actingAs($this->staff)
            ->postJson("/api/v1/admin/bookings/{$booking->id}/check-in", ['room_id' => $this->room->id]);
    }

    // ---- 1. Check-in only during the booked stay ----

    public function test_check_in_before_the_check_in_date_is_rejected(): void
    {
        $booking = $this->book(startInDays: 3, nights: 2);

        $this->checkIn($booking)
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertSame(Booking::STATUS_CONFIRMED, $booking->fresh()->status);
        $this->assertSame('available', $this->room->fresh()->status);
    }

    public function test_check_in_on_the_check_in_date_is_allowed(): void
    {
        $booking = $this->book(startInDays: 0, nights: 2);

        $this->checkIn($booking)->assertOk()->assertJsonPath('data.status', Booking::STATUS_CHECKED_IN);
    }

    public function test_check_in_after_the_stay_is_over_is_rejected(): void
    {
        $booking = $this->book(startInDays: 0, nights: 1);
        // The stay was yesterday to today: check-out day has arrived.
        $booking->update([
            'check_in_date' => Carbon::today()->subDays(2)->toDateString(),
            'check_out_date' => Carbon::today()->toDateString(),
        ]);

        $this->checkIn($booking)->assertStatus(422)->assertJsonPath('success', false);
        $this->assertSame(Booking::STATUS_CONFIRMED, $booking->fresh()->status);
    }

    // ---- 2. Maintenance rooms are not sellable ----

    public function test_rooms_under_maintenance_reduce_the_sellable_stock(): void
    {
        $this->room->update(['status' => 'maintenance']);

        // total_rooms is 2, one room is in maintenance, so only 1 can be sold for the dates.
        $this->book(startInDays: 5);

        $this->actingAs($this->customer)
            ->postJson('/api/v1/bookings', [
                'room_type_id' => $this->roomType->id,
                'check_in_date' => Carbon::today()->addDays(5)->toDateString(),
                'check_out_date' => Carbon::today()->addDays(6)->toDateString(),
                'total_adults' => 2,
            ])
            ->assertStatus(409);
    }

    public function test_room_list_shows_maintenance_adjusted_availability(): void
    {
        $this->room->update(['status' => 'maintenance']);

        $res = $this->getJson('/api/v1/room-types?check_in=' . Carbon::today()->addDays(5)->toDateString()
            . '&check_out=' . Carbon::today()->addDays(6)->toDateString());

        $res->assertOk()->assertJsonPath('data.room_types.0.available_rooms_count', 1);
    }

    // ---- 3. Occupied rooms keep their status while a guest is inside ----

    public function test_cannot_free_a_room_that_has_a_checked_in_guest(): void
    {
        $booking = $this->book();
        $this->checkIn($booking)->assertOk();

        $this->actingAs($this->staff)
            ->patchJson("/api/v1/admin/rooms/{$this->room->id}/status", ['status' => 'available'])
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertSame('occupied', $this->room->fresh()->status);
    }

    public function test_cannot_delete_a_room_that_has_a_checked_in_guest(): void
    {
        $booking = $this->book();
        $this->checkIn($booking)->assertOk();

        $this->actingAs($this->superAdmin)
            ->deleteJson("/api/v1/admin/rooms/{$this->room->id}")
            ->assertStatus(422);

        $this->assertNotNull(Room::find($this->room->id));
    }

    public function test_room_can_be_freed_after_the_guest_checks_out(): void
    {
        $booking = $this->book();
        $this->checkIn($booking)->assertOk();

        $this->actingAs($this->staff)->postJson("/api/v1/admin/bookings/{$booking->id}/check-out")->assertOk();

        $this->actingAs($this->staff)
            ->patchJson("/api/v1/admin/rooms/{$this->room->id}/status", ['status' => 'available'])
            ->assertOk();
    }

    // ---- 4. A guest who is inside cannot be cancelled ----

    public function test_checked_in_guest_cannot_be_cancelled_even_with_the_key(): void
    {
        $booking = $this->book();
        $this->checkIn($booking)->assertOk();

        $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/bookings/{$booking->id}/cancel", [
                'cancellation_key' => 'KEY-123',
                'reason' => 'test',
            ])
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertSame(Booking::STATUS_CHECKED_IN, $booking->fresh()->status);
        $this->assertSame('occupied', $this->room->fresh()->status);
    }

    // ---- 7. Guest capacity ----

    public function test_more_adults_than_the_room_allows_is_rejected(): void
    {
        $this->actingAs($this->customer)
            ->postJson('/api/v1/bookings', [
                'room_type_id' => $this->roomType->id,
                'check_in_date' => Carbon::today()->addDays(2)->toDateString(),
                'check_out_date' => Carbon::today()->addDays(3)->toDateString(),
                'total_adults' => 3,
            ])
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertSame(0, Booking::count());
    }

    public function test_more_children_than_the_room_allows_is_rejected(): void
    {
        $this->actingAs($this->customer)
            ->postJson('/api/v1/bookings', [
                'room_type_id' => $this->roomType->id,
                'check_in_date' => Carbon::today()->addDays(2)->toDateString(),
                'check_out_date' => Carbon::today()->addDays(3)->toDateString(),
                'total_adults' => 2,
                'total_children' => 2,
            ])
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertSame(0, Booking::count());
    }

    public function test_guests_within_capacity_are_accepted(): void
    {
        $this->actingAs($this->customer)
            ->postJson('/api/v1/bookings', [
                'room_type_id' => $this->roomType->id,
                'check_in_date' => Carbon::today()->addDays(2)->toDateString(),
                'check_out_date' => Carbon::today()->addDays(3)->toDateString(),
                'total_adults' => 2,
                'total_children' => 1,
            ])
            ->assertCreated();
    }
}
