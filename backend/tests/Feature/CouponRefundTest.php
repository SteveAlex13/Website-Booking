<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\DiscountCoupon;
use App\Models\Hotel;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\RoomType;
use App\Models\User;
use App\Services\HotelBookingService;
use App\Services\MidtransService;
use Carbon\Carbon;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/**
 * Coupon quota is returned when a booking is cancelled or expires, and a paid booking
 * that is cancelled opens a refund that the super admin processes.
 */
class CouponRefundTest extends TestCase
{
    use RefreshDatabase;

    private string $serverKey = 'test-server-key-12345';

    private User $customer;
    private User $staff;
    private User $superAdmin;
    private RoomType $roomType;

    protected function setUp(): void
    {
        parent::setUp();
        config(['midtrans.server_key' => $this->serverKey]);

        $this->customer = User::factory()->create(['role' => 'customer']);
        $this->staff = User::factory()->create(['role' => 'admin']);
        $this->superAdmin = User::factory()->create(['role' => 'super_admin', 'cancellation_key' => 'KEY-123']);

        $hotel = Hotel::create([
            'name' => 'Royal Resort Bali', 'star_rating' => 5, 'address' => 'Jl. Pantai Kuta',
            'city' => 'Bali', 'phone' => '0361-12345', 'email' => 'info@royal.com',
        ]);

        $this->roomType = RoomType::create([
            'hotel_id' => $hotel->id, 'name' => 'Deluxe King', 'slug' => 'deluxe-king',
            'base_price_per_night' => 500000, 'max_adults' => 2, 'max_children' => 1,
            'room_size_sqm' => 35, 'bed_type' => '1 King Bed', 'total_rooms' => 3, 'is_active' => true,
        ]);
    }

    private function book(array $override = []): Booking
    {
        return app(HotelBookingService::class)->createBooking($this->customer, array_merge([
            'room_type_id' => $this->roomType->id,
            'check_in_date' => Carbon::today()->addDays(5)->toDateString(),
            'check_out_date' => Carbon::today()->addDays(7)->toDateString(),
            'total_adults' => 2,
            'payment_method' => 'midtrans',
        ], $override));
    }

    /** Pay the booking through a signed Midtrans notification. */
    private function pay(Booking $booking, string $type = 'qris'): Payment
    {
        $payment = Payment::create([
            'booking_id' => $booking->id,
            'order_id' => 'ORDER-' . $booking->id,
            'gross_amount' => $booking->total_amount,
            'status' => Payment::STATUS_PENDING,
        ]);

        $this->notify($payment, 'settlement', $type)->assertOk();

        return $payment->fresh();
    }

    private function notify(Payment $payment, string $status, string $type = 'qris')
    {
        $gross = number_format((float) $payment->gross_amount, 2, '.', '');

        return $this->postJson('/api/v1/webhooks/midtrans', [
            'order_id' => $payment->order_id,
            'status_code' => '200',
            'gross_amount' => $gross,
            'signature_key' => hash('sha512', $payment->order_id . '200' . $gross . $this->serverKey),
            'transaction_status' => $status,
            'payment_type' => $type,
            'transaction_id' => 'trx-' . $payment->id,
        ]);
    }

    private function cancelWithKey(Booking $booking)
    {
        return $this->actingAs($this->superAdmin)->postJson("/api/v1/admin/bookings/{$booking->id}/cancel", [
            'cancellation_key' => 'KEY-123',
            'reason' => 'Tamu batal',
        ]);
    }

    private function coupon(int $limit = 5): DiscountCoupon
    {
        return DiscountCoupon::create([
            'code' => 'HEMAT', 'name' => 'Hemat', 'type' => 'fixed', 'value' => 10000,
            'min_spend' => 0, 'usage_limit' => $limit, 'is_active' => true,
        ]);
    }

    // ---------- Coupon quota ----------

    public function test_coupon_quota_returns_when_the_guest_cancels(): void
    {
        $coupon = $this->coupon();
        $booking = $this->book(['coupon_code' => 'HEMAT']);
        $this->assertSame(1, $coupon->fresh()->used_count);

        $this->actingAs($this->customer)
            ->postJson("/api/v1/bookings/{$booking->id}/cancel", ['reason' => 'berubah rencana'])
            ->assertOk();

        $this->assertSame(0, $coupon->fresh()->used_count);
    }

    public function test_coupon_quota_returns_when_the_payment_hold_expires(): void
    {
        $coupon = $this->coupon();
        $booking = $this->book(['coupon_code' => 'HEMAT']);
        $booking->update(['expires_at' => Carbon::now()->subMinute()]);

        Artisan::call('bookings:expire-pending');

        $this->assertSame(Booking::STATUS_EXPIRED, $booking->fresh()->status);
        $this->assertSame(0, $coupon->fresh()->used_count);
    }

    public function test_coupon_quota_is_returned_only_once(): void
    {
        $coupon = $this->coupon();
        $this->book(['coupon_code' => 'HEMAT']);
        $second = $this->book([
            'coupon_code' => 'HEMAT',
            'check_in_date' => Carbon::today()->addDays(20)->toDateString(),
            'check_out_date' => Carbon::today()->addDays(21)->toDateString(),
        ]);
        $this->assertSame(2, $coupon->fresh()->used_count);

        $service = app(HotelBookingService::class);
        $service->cancelBooking($second);
        $service->cancelBooking($second->fresh()); // already cancelled, must not decrement again

        $this->assertSame(1, $coupon->fresh()->used_count);
    }

    // ---------- Refund ----------

    public function test_cancelling_an_unpaid_booking_creates_no_refund(): void
    {
        $booking = $this->book();

        $this->cancelWithKey($booking)->assertOk()->assertJsonPath('refund', null);

        $this->assertSame(0, Refund::count());
    }

    public function test_cancelling_a_paid_booking_opens_a_pending_refund(): void
    {
        $booking = $this->book();
        $payment = $this->pay($booking);
        $this->assertSame(Payment::STATUS_PAID, $payment->status);

        $this->cancelWithKey($booking)
            ->assertOk()
            ->assertJsonPath('refund.status', Refund::STATUS_PENDING);

        $refund = Refund::first();
        $this->assertSame($payment->id, $refund->payment_id);
        $this->assertEquals((float) $booking->total_amount, (float) $refund->amount);
        $this->assertSame(Payment::STATUS_REFUND_PENDING, $payment->fresh()->status);
        $this->assertSame(Booking::STATUS_CANCELLED, $booking->fresh()->status);
    }

    public function test_a_repeated_settlement_notification_does_not_revive_a_cancelled_booking(): void
    {
        $booking = $this->book();
        $payment = $this->pay($booking);
        $this->cancelWithKey($booking)->assertOk();

        // Midtrans (or the status sync) still says "settlement" until the refund is done
        $this->notify($payment, 'settlement')->assertOk();

        $this->assertSame(Payment::STATUS_REFUND_PENDING, $payment->fresh()->status);
        $this->assertSame(Booking::STATUS_CANCELLED, $booking->fresh()->status);
    }

    public function test_super_admin_processes_a_pending_refund(): void
    {
        $booking = $this->book();
        $payment = $this->pay($booking);
        $this->cancelWithKey($booking)->assertOk();
        $refund = Refund::first();

        // Placeholder key: the Midtrans call is simulated
        config(['midtrans.server_key' => 'SB-Mid-server-placeholder']);

        $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/refunds/{$refund->id}/process")
            ->assertOk()
            ->assertJsonPath('success', true);

        $refund->refresh();
        $this->assertSame(Refund::STATUS_PROCESSED, $refund->status);
        $this->assertNotNull($refund->processed_at);
        $this->assertNotNull($refund->refund_id);
        $this->assertSame(Payment::STATUS_REFUNDED, $payment->fresh()->status);

        // Cannot be processed twice
        $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/refunds/{$refund->id}/process")
            ->assertStatus(422);
    }

    public function test_a_failed_midtrans_refund_stays_pending_so_it_can_be_retried(): void
    {
        $booking = $this->book();
        $payment = $this->pay($booking);
        $this->cancelWithKey($booking)->assertOk();
        $refund = Refund::first();

        $this->mock(MidtransService::class, function ($mock) {
            $mock->shouldReceive('refund')->andThrow(new Exception('Midtrans menolak refund: transaksi belum settlement'));
        });

        $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/refunds/{$refund->id}/process")
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertSame(Refund::STATUS_PENDING, $refund->fresh()->status);
        $this->assertSame(Payment::STATUS_REFUND_PENDING, $payment->fresh()->status);
    }

    public function test_front_desk_and_guests_cannot_process_refunds(): void
    {
        $booking = $this->book();
        $this->pay($booking);
        $this->cancelWithKey($booking)->assertOk();
        $refund = Refund::first();

        $this->actingAs($this->staff)->postJson("/api/v1/admin/refunds/{$refund->id}/process")->assertForbidden();
        $this->actingAs($this->customer)->postJson("/api/v1/admin/refunds/{$refund->id}/process")->assertForbidden();

        $this->assertSame(Refund::STATUS_PENDING, $refund->fresh()->status);
    }

    public function test_refund_pending_payment_no_longer_counts_as_revenue(): void
    {
        $booking = $this->book();
        $this->pay($booking);

        $revenue = fn () => $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/admin/dashboard')
            ->json('data.total_revenue');

        $this->assertEquals((float) $booking->total_amount, $revenue());

        $this->cancelWithKey($booking)->assertOk();

        $this->assertEquals(0, $revenue());
    }

    public function test_payment_list_includes_refunds_for_the_super_admin(): void
    {
        $booking = $this->book();
        $this->pay($booking);
        $this->cancelWithKey($booking)->assertOk();

        $this->actingAs($this->superAdmin)->getJson('/api/v1/admin/payments')
            ->assertOk()
            ->assertJsonPath('data.data.0.status', Payment::STATUS_REFUND_PENDING)
            ->assertJsonPath('data.data.0.refunds.0.status', Refund::STATUS_PENDING);
    }
}
