<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Payment;
use Exception;
use Illuminate\Support\Facades\Log;
use Midtrans\Config as MidtransConfig;
use Midtrans\Snap as MidtransSnap;
use Midtrans\Transaction as MidtransTransaction;

class MidtransService
{
    public function __construct()
    {
        MidtransConfig::$serverKey = config('midtrans.server_key');
        MidtransConfig::$clientKey = config('midtrans.client_key');
        MidtransConfig::$isProduction = (bool) config('midtrans.is_production', false);
        MidtransConfig::$isSanitized = (bool) config('midtrans.is_sanitized', true);
        MidtransConfig::$is3ds = (bool) config('midtrans.is_3ds', true);
    }

    /**
     * Create Snap Token for a booking payment.
     */
    public function createSnapToken(Booking $booking, string $orderId): string
    {
        $serverKey = config('midtrans.server_key');

        // Check if server key is configured (if placeholder in dev, allow simulated token generation)
        if (empty($serverKey) || str_contains($serverKey, 'placeholder')) {
            Log::info('Midtrans placeholder key detected. Generating simulated Snap Token.', [
                'order_id' => $orderId,
            ]);
            return 'SIMULATED_SNAP_TOKEN_' . bin2hex(random_bytes(16));
        }

        $roomTypeName = $booking->roomType ? $booking->roomType->name : 'Kamar Hotel';
        $itemDetails = [
            [
                'id' => 'ROOM-' . $booking->room_type_id,
                'price' => (int) round($booking->total_room_amount),
                'quantity' => 1,
                'name' => substr("{$roomTypeName} ({$booking->total_nights} mlm)", 0, 50),
            ],
        ];

        // Add extra items
        foreach ($booking->extraItems as $extra) {
            $itemDetails[] = [
                'id' => 'EXTRA-' . $extra->id,
                'price' => (int) round($extra->subtotal),
                'quantity' => 1,
                'name' => substr($extra->name, 0, 50),
            ];
        }

        // Add tax & service if present
        if ($booking->tax_and_service_amount > 0) {
            $itemDetails[] = [
                'id' => 'TAX-SERVICE',
                'price' => (int) round($booking->tax_and_service_amount),
                'quantity' => 1,
                'name' => 'Pajak & Biaya Layanan 10%',
            ];
        }

        $params = [
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => (int) round($booking->total_amount),
            ],
            'customer_details' => [
                'first_name' => $booking->customer_name,
                'email' => $booking->customer_email ?? $booking->user->email,
                'phone' => $booking->customer_phone,
            ],
            'item_details' => $itemDetails,
            'expiry' => [
                'start_time' => date('Y-m-d H:i:s O'),
                'unit' => 'minute',
                'duration' => (int) config('midtrans.booking_expiration_minutes', 15),
            ],
            'enabled_payments' => [
                'qris',
                'gopay',
                'shopeepay',
                'bank_transfer',
                'bca_va',
                'bni_va',
                'bri_va',
                'mandiri_va',
                'permata_va',
                'credit_card',
            ],
        ];

        try {
            return MidtransSnap::getSnapToken($params);
        } catch (Exception $e) {
            Log::error('Midtrans Snap Token Exception: ' . $e->getMessage(), [
                'order_id' => $orderId,
                'error' => $e->getTraceAsString(),
            ]);

            // If midtrans fails due to test credentials, provide a test token so dev/testing doesn't block
            if (! config('midtrans.is_production')) {
                return 'SANDBOX_FALLBACK_TOKEN_' . bin2hex(random_bytes(16));
            }

            throw new Exception('Gagal membuat token pembayaran Midtrans: ' . $e->getMessage());
        }
    }

    /**
     * Verify Midtrans webhook notification signature.
     * Signature = SHA512(order_id + status_code + gross_amount + server_key)
     */
    public function verifySignature(string $orderId, string $statusCode, string $grossAmount, string $signature): bool
    {
        $serverKey = config('midtrans.server_key');
        
        // In sandbox placeholder mode, accept test signature if indicated
        if (str_contains($serverKey, 'placeholder') && $signature === 'SIMULATED_SIGNATURE') {
            return true;
        }

        $expectedSignature = hash('sha512', $orderId . $statusCode . $grossAmount . $serverKey);
        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Refund a settled transaction at Midtrans.
     * Returns the refund key. With the placeholder key (no real account) it only simulates success.
     *
     * @throws Exception when Midtrans rejects the refund
     */
    public function refund(string $orderId, int $amount, string $refundKey, ?string $reason = null): string
    {
        $serverKey = config('midtrans.server_key');
        if (empty($serverKey) || str_contains($serverKey, 'placeholder')) {
            Log::info('Midtrans placeholder key detected. Simulating refund.', ['order_id' => $orderId]);
            return $refundKey;
        }

        try {
            $response = MidtransTransaction::refund($orderId, [
                'refund_key' => $refundKey,
                'amount' => $amount,
                'reason' => substr((string) $reason, 0, 200),
            ]);
        } catch (Exception $e) {
            Log::warning("Midtrans refund failed for {$orderId}: " . $e->getMessage());
            throw new Exception('Midtrans menolak refund: ' . $e->getMessage());
        }

        $statusCode = (string) ($response->status_code ?? '');
        if ($statusCode !== '' && ! str_starts_with($statusCode, '2')) {
            $message = $response->status_message ?? 'status ' . $statusCode;
            throw new Exception('Midtrans menolak refund: ' . $message);
        }

        return $refundKey;
    }

    /**
     * Get transaction status from Midtrans API directly.
     */
    public function getTransactionStatus(string $orderId): ?object
    {
        $serverKey = config('midtrans.server_key');
        if (str_contains($serverKey, 'placeholder')) {
            return null;
        }

        try {
            return MidtransTransaction::status($orderId);
        } catch (Exception $e) {
            Log::warning("Midtrans Transaction Status check failed for {$orderId}: " . $e->getMessage());
            return null;
        }
    }
}

