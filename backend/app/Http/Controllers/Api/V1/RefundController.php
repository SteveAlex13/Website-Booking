<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Refund;
use App\Services\MidtransService;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RefundController extends Controller
{
    public function __construct(
        protected MidtransService $midtransService
    ) {}

    /**
     * Super admin: process a pending refund through Midtrans.
     * Cash payments have no Midtrans transaction, so they are only marked as processed
     * (the money is handed back at the front desk).
     */
    public function process(int $id): JsonResponse
    {
        $refund = Refund::with('payment.booking')->findOrFail($id);

        if ($refund->status !== Refund::STATUS_PENDING) {
            return response()->json([
                'success' => false,
                'message' => 'Refund ini sudah diproses.',
            ], 422);
        }

        $payment = $refund->payment;

        try {
            $refundKey = null;

            if ($payment->payment_type !== 'cash') {
                $refundKey = $this->midtransService->refund(
                    $payment->order_id,
                    (int) round((float) $refund->amount),
                    'REFUND-' . $refund->id . '-' . strtoupper(Str::random(6)),
                    $refund->reason
                );
            }
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        DB::transaction(function () use ($refund, $payment, $refundKey) {
            $refund->update([
                'refund_id' => $refundKey,
                'status' => Refund::STATUS_PROCESSED,
                'processed_at' => Carbon::now(),
            ]);

            $payment->update(['status' => Payment::STATUS_REFUNDED]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Refund berhasil diproses.',
            'data' => $refund->fresh('payment'),
        ]);
    }
}
