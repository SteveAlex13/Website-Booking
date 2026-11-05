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
