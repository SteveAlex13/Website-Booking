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
