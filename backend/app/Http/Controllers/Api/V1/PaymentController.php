<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use App\Services\PaymentService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(
        protected PaymentService $paymentService
    ) {}

    /**
     * Create Snap Checkout for a booking.
     */
    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id',
        ]);

        $booking = Booking::with('user')->findOrFail($validated['booking_id']);

        // Only owner or admin can initiate payment
        if (! $request->user()->isAdmin() && $booking->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak.',
            ], 403);
        }

        // Cash on Arrival (Bayar di Hotel)
        if ($booking->payment_method === 'cash') {
            $payment = Payment::where('booking_id', $booking->id)->latest()->first();
            return response()->json([
                'success' => true,
                'message' => 'Metode bayar tunai di hotel (Front Desk).',
                'data' => [
                    'payment_id' => $payment?->id,
                    'order_id' => $payment?->order_id,
                    'is_cash' => true,
                    'gross_amount' => (float) $booking->total_amount,
                ],
            ]);
        }

        try {
            $checkoutData = $this->paymentService->createCheckout($booking);

            return response()->json([
                'success' => true,
                'message' => 'Token pembayaran berhasil dibuat.',
                'data' => $checkoutData,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get payment details.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $payment = Payment::with([
            'booking.roomType',
            'booking.assignedRoom',
            'booking.extraItems',
            'booking.discountCoupon',
            'logs',
        ])->findOrFail($id);

        if (! $request->user()->isAdmin() && $payment->booking->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $payment,
        ]);
    }

    /**
     * Check payment status and reconcile against Midtrans.
     */
    public function checkStatus(Request $request, int $id): JsonResponse
    {
        $payment = Payment::with('booking')->findOrFail($id);

        if (! $request->user()->isAdmin() && $payment->booking->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak.',
            ], 403);
        }

        $payment = $this->paymentService->checkStatus($payment);

        return response()->json([
            'success' => true,
            'data' => [
                'payment' => $payment,
                'booking' => $payment->booking->fresh(),
            ],
        ]);
    }

    /**
     * Admin: list all payments.
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = Payment::with(['booking.user', 'booking.roomType', 'booking.assignedRoom']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_id', 'like', "%{$search}%")
                    ->orWhere('transaction_id', 'like', "%{$search}%")
                    ->orWhereHas('booking', function ($b) use ($search) {
                        $b->where('booking_code', 'like', "%{$search}%")
                            ->orWhere('customer_name', 'like', "%{$search}%");
                    });
            });
        }

        $payments = $query->orderBy('id', 'desc')->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $payments,
        ]);
    }
}

