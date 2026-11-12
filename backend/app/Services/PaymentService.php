<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingStatusHistory;
use App\Models\Payment;
use App\Models\PaymentLog;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentService
{
    public function __construct(
        protected MidtransService $midtransService,
        protected HotelBookingService $bookingService,
        protected RoomAvailabilityService $availabilityService
    ) {}

    /**
     * Create or retrieve Snap checkout for a booking.
     */
    public function createCheckout(Booking $booking): array
    {
        return DB::transaction(function () use ($booking) {
            $lockedBooking = Booking::where('id', $booking->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedBooking->status !== Booking::STATUS_PENDING_PAYMENT) {
                throw new Exception('Hanya booking yang menunggu pembayaran yang dapat dibayar.');
            }

            if ($lockedBooking->expires_at && $lockedBooking->expires_at->lte(Carbon::now())) {
                $this->bookingService->expireBooking($lockedBooking);
                throw new Exception('Batas waktu pembayaran booking ini sudah habis (Expired). Silakan buat booking baru.');
            }

            // Check if there is an existing pending payment with a snap token
            $existingPayment = Payment::where('booking_id', $lockedBooking->id)
                ->where('status', Payment::STATUS_PENDING)
                ->latest()
                ->first();

            if ($existingPayment && $existingPayment->snap_token) {
                return [
                    'payment_id' => $existingPayment->id,
                    'order_id' => $existingPayment->order_id,
                    'snap_token' => $existingPayment->snap_token,
                    'gross_amount' => (float) $existingPayment->gross_amount,
                    'client_key' => config('midtrans.client_key'),
                ];
            }

            // Generate unique order ID
            $datePrefix = Carbon::now()->format('Ymd');
            $uniqueCode = strtoupper(Str::random(6));
            $orderId = "ORDER-{$datePrefix}-{$lockedBooking->id}-{$uniqueCode}";

            // Request Snap token from Midtrans
            $snapToken = $this->midtransService->createSnapToken($lockedBooking, $orderId);

            $payment = Payment::create([
                'booking_id' => $lockedBooking->id,
                'order_id' => $orderId,
                'snap_token' => $snapToken,
                'gross_amount' => $lockedBooking->total_amount,
                'status' => Payment::STATUS_PENDING,
                'expired_at' => $lockedBooking->expires_at,
            ]);

            return [
                'payment_id' => $payment->id,
                'order_id' => $payment->order_id,
                'snap_token' => $payment->snap_token,
                'gross_amount' => (float) $payment->gross_amount,
                'client_key' => config('midtrans.client_key'),
            ];
        });
    }

    /**
     * Handle Midtrans Webhook Notification or Direct Status Sync.
     */
    public function handleWebhook(array $payload, bool $skipSignatureCheck = false): array
    {
        $orderId = $payload['order_id'] ?? null;
        $statusCode = (string) ($payload['status_code'] ?? '');
        $grossAmount = (string) ($payload['gross_amount'] ?? '');
        $signatureKey = (string) ($payload['signature_key'] ?? '');
        $transactionStatus = $payload['transaction_status'] ?? '';
        $fraudStatus = $payload['fraud_status'] ?? '';
        $paymentType = $payload['payment_type'] ?? null;
        $transactionId = $payload['transaction_id'] ?? null;

        if (! $orderId) {
            throw new Exception('Payload tidak valid: order_id tidak ditemukan.');
        }

        // 1. Verify signature (skip if direct authenticated status API call)
        $isSignatureValid = $skipSignatureCheck || $this->midtransService->verifySignature(
            $orderId,
            $statusCode,
            $grossAmount,
            $signatureKey
        );

        // Find payment
        $payment = Payment::where('order_id', $orderId)->first();

        // 2. Log webhook notification
        PaymentLog::create([
            'payment_id' => $payment?->id,
            'event_type' => $transactionStatus,
            'order_id' => $orderId,
            'payload' => $payload,
            'signature_valid' => $isSignatureValid,
            'processed_at' => Carbon::now(),
            'processing_result' => $isSignatureValid ? 'VALID' : 'INVALID_SIGNATURE',
        ]);

        if (! $isSignatureValid) {
            Log::warning("Midtrans Webhook: Invalid signature for Order {$orderId}");
            throw new Exception('Signature webhook tidak valid.');
        }

        if (! $payment) {
            Log::error("Midtrans Webhook: Payment with order_id {$orderId} not found.");
            throw new Exception("Order ID {$orderId} tidak ditemukan.");
        }

        // Verify gross amount match
        if ((int) round($payment->gross_amount) !== (int) round((float) $grossAmount)) {
            Log::error("Midtrans Webhook: Amount mismatch for {$orderId}. Expected {$payment->gross_amount}, got {$grossAmount}");
            throw new Exception('Nominal transaksi tidak cocok.');
        }

        // 3. Atomically update payment & booking
        return DB::transaction(function () use (
            $payment,
            $transactionStatus,
            $fraudStatus,
            $paymentType,
            $transactionId,
            $payload
        ) {
            $lockedPayment = Payment::where('id', $payment->id)->lockForUpdate()->firstOrFail();
            $booking = Booking::where('id', $lockedPayment->booking_id)->lockForUpdate()->firstOrFail();

            $lockedPayment->transaction_id = $transactionId;
            $lockedPayment->payment_type = $paymentType;
            $lockedPayment->provider_status = $transactionStatus;
            $lockedPayment->fraud_status = $fraudStatus;
            $lockedPayment->provider_response = $payload;

            // Mapping Midtrans status according to Section 8.5 & Section 7
            if ($transactionStatus === 'settlement' || ($transactionStatus === 'capture' && $fraudStatus === 'accept')) {
                // Success / Paid
                if ($lockedPayment->status !== Payment::STATUS_PAID && $lockedPayment->status !== Payment::STATUS_PAID_NO_SLOT) {
                    $isHoldOverdue = ($booking->status === Booking::STATUS_EXPIRED) ||
                        ($booking->expires_at && $booking->expires_at->lte(Carbon::now()) && $booking->status === Booking::STATUS_PENDING_PAYMENT);

                    $hasAvailableSlot = true;
                    if ($isHoldOverdue) {
                        $roomType = $booking->roomType ?? \App\Models\RoomType::find($booking->room_type_id);
                        $availability = $this->availabilityService->checkRoomTypeAvailability(
                            $roomType,
                            Carbon::parse($booking->check_in_date),
                            Carbon::parse($booking->check_out_date)
                        );
                        $hasAvailableSlot = $availability['is_available'] && $availability['available_rooms_count'] > 0;
                    }

                    if ($hasAvailableSlot) {
                        $lockedPayment->status = Payment::STATUS_PAID;
                        $lockedPayment->paid_at = Carbon::now();
                        $lockedPayment->save();

                        // Confirm Booking
                        if ($booking->status !== Booking::STATUS_CONFIRMED) {
                            $oldStatus = $booking->status;
                            $booking->status = Booking::STATUS_CONFIRMED;
                            $booking->confirmed_at = Carbon::now();
                            $booking->save();

                            BookingStatusHistory::create([
                                'booking_id' => $booking->id,
                                'old_status' => $oldStatus,
                                'new_status' => Booking::STATUS_CONFIRMED,
                                'changed_by' => null,
                                'note' => "Pembayaran berhasil dikonfirmasi via Midtrans ({$paymentType}).",
                            ]);
                        }
                    } else {
                        // Section 7: Payment arrived after hold expired and room was taken by another customer -> Mark PAID_NO_SLOT for refund
                        $lockedPayment->status = Payment::STATUS_PAID_NO_SLOT;
                        $lockedPayment->paid_at = Carbon::now();
                        $lockedPayment->save();

                        $oldStatus = $booking->status;
                        $booking->status = Booking::STATUS_PAID_NO_SLOT;
                        $booking->save();

                        BookingStatusHistory::create([
                            'booking_id' => $booking->id,
                            'old_status' => $oldStatus,
                            'new_status' => Booking::STATUS_PAID_NO_SLOT,
                            'changed_by' => null,
                            'note' => "Pembayaran diterima setelah batas hold kedaluwarsa dan kamar telah terisi penuh oleh tamu lain. Ditandai PAID_NO_SLOT untuk pengembalian dana (refund).",
                        ]);

                        Log::warning("PAID_NO_SLOT: Booking {$booking->booking_code} (Order: {$lockedPayment->order_id}) paid after hold expired and room was taken. Ready for refund.");
                    }
                }
            } elseif ($transactionStatus === 'pending') {
                $lockedPayment->status = Payment::STATUS_PENDING;
                $lockedPayment->save();
            } elseif (in_array($transactionStatus, ['deny', 'failed'])) {
                $lockedPayment->status = Payment::STATUS_FAILED;
                $lockedPayment->save();
            } elseif ($transactionStatus === 'expire') {
                $lockedPayment->status = Payment::STATUS_EXPIRED;
                $lockedPayment->expired_at = Carbon::now();
                $lockedPayment->save();

                if ($booking->status === Booking::STATUS_PENDING_PAYMENT) {
                    $this->bookingService->expireBooking($booking);
                }
            } elseif ($transactionStatus === 'cancel') {
                $lockedPayment->status = Payment::STATUS_CANCELLED;
                $lockedPayment->save();

                if ($booking->status === Booking::STATUS_PENDING_PAYMENT) {
                    $this->bookingService->cancelBooking($booking, null, 'Transaksi Midtrans dibatalkan.');
                }
            } elseif ($transactionStatus === 'refund') {
                $lockedPayment->status = Payment::STATUS_REFUNDED;
                $lockedPayment->save();
            } elseif ($transactionStatus === 'partial_refund') {
                $lockedPayment->status = Payment::STATUS_PARTIALLY_REFUNDED;
                $lockedPayment->save();
            }

            return [
                'order_id' => $lockedPayment->order_id,
                'payment_status' => $lockedPayment->status,
                'booking_status' => $booking->status,
            ];
        });
    }

    /**
     * Check payment status and reconcile if needed.
     */
    public function checkStatus(Payment $payment): Payment
    {
        // Cash payment does not sync with Midtrans API
        if ($payment->payment_type === 'cash' || str_starts_with((string) $payment->order_id, 'CASH-')) {
            return $payment;
        }

        $statusObj = $this->midtransService->getTransactionStatus($payment->order_id);
        if ($statusObj) {
            $payload = (array) $statusObj;
            $this->handleWebhook($payload, true);
            $payment->refresh();
        }

        return $payment;
    }
}

