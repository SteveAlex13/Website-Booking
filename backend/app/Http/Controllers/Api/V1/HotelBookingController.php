<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\DiscountCoupon;
use App\Models\ExtraService;
use App\Models\RoomType;
use App\Models\User;
use App\Services\HotelBookingService;
use App\Services\RoomAvailabilityService;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HotelBookingController extends Controller
{
    public function __construct(
        protected HotelBookingService $bookingService,
        protected RoomAvailabilityService $availabilityService
    ) {}

    /**
     * Preview calculation of hotel stay cost with extras and tax.
     */
    public function calculatePrice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_type_id' => 'required|exists:room_types,id',
            'check_in_date' => 'required|date|after_or_equal:today',
            'check_out_date' => 'required|date|after:check_in_date',
            'payment_method' => 'nullable|in:midtrans,cash',
            'coupon_code' => 'nullable|string|max:50',
            'extras' => 'nullable|array',
            'extras.*.id' => 'exists:extra_services,id',
            'extras.*.quantity' => 'nullable|integer|min:1',
        ]);

        $roomType = RoomType::findOrFail($validated['room_type_id']);
        $checkIn = Carbon::parse($validated['check_in_date'])->startOfDay();
        $checkOut = Carbon::parse($validated['check_out_date'])->startOfDay();

        $costDetails = $roomType->calculateTotalRoomCost($checkIn, $checkOut);
        $totalRoomAmount = (float) $costDetails['total_amount'];
        $nights = $costDetails['nights'];

        $totalExtras = 0;
        $extrasBreakdown = [];
        if (! empty($validated['extras'])) {
            foreach ($validated['extras'] as $item) {
                $extra = ExtraService::find($item['id']);
                if ($extra) {
                    $qty = max(1, (int) ($item['quantity'] ?? 1));
                    $unitPrice = (float) $extra->price;
                    $subtotal = ($extra->price_type === 'per_night')
                        ? ($unitPrice * $qty * $nights)
                        : ($unitPrice * $qty);

                    $totalExtras += $subtotal;
                    $extrasBreakdown[] = [
                        'id' => $extra->id,
                        'name' => $extra->name,
                        'price' => $unitPrice,
                        'quantity' => $qty,
                        'price_type' => $extra->price_type,
                        'subtotal' => $subtotal,
                    ];
                }
            }
        }

        $subtotal = $totalRoomAmount + $totalExtras;

        // Calculate discount if coupon code provided
        $discountAmount = 0.0;
        $discountCouponData = null;
        $couponMessage = null;

        if (! empty($validated['coupon_code'])) {
            $code = strtoupper(trim($validated['coupon_code']));
            $coupon = DiscountCoupon::where('code', $code)->first();

            if ($coupon) {
                $check = $coupon->checkValidity($subtotal);
                if ($check['valid']) {
                    $discountAmount = $coupon->calculateDiscount($subtotal);
                    $discountCouponData = [
                        'id' => $coupon->id,
                        'code' => $coupon->code,
                        'name' => $coupon->name,
                        'type' => $coupon->type,
                        'value' => (float) $coupon->value,
                        'discount_amount' => $discountAmount,
                    ];
                    $couponMessage = "Kupon {$coupon->name} berhasil digunakan!";
                } else {
                    $couponMessage = $check['message'];
                }
            } else {
                $couponMessage = "Kode promo '{$code}' tidak valid.";
            }
        }

        $taxableSubtotal = max(0.0, $subtotal - $discountAmount);
        $tax = round($taxableSubtotal * 0.10, 2);
        $grandTotal = round($taxableSubtotal + $tax, 2);

        $availability = $this->availabilityService->checkRoomTypeAvailability($roomType, $checkIn, $checkOut);

        return response()->json([
            'success' => true,
            'data' => [
                'nights' => $nights,
                'check_in' => $checkIn->toDateString(),
                'check_out' => $checkOut->toDateString(),
                'room_cost' => $costDetails,
                'extras_total' => $totalExtras,
                'extras_breakdown' => $extrasBreakdown,
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'discount_code' => $discountCouponData['code'] ?? null,
                'coupon' => $discountCouponData,
                'coupon_message' => $couponMessage,
                'taxable_amount' => $taxableSubtotal,
                'tax_and_service' => $tax,
                'grand_total' => $grandTotal,
                'is_available' => $availability['is_available'],
                'available_rooms_count' => $availability['available_rooms_count'],
            ],
        ]);
    }

    /**
     * Customer: Create a hotel room booking.
     */
    public function store(Request $request): JsonResponse
    {
        // Only guests (role customer) can book a room. Front desk and super admin cannot.
        if (! $request->user()->isCustomer()) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya akun tamu (customer) yang dapat memesan kamar.',
            ], 403);
        }

        $validated = $request->validate([
            'room_type_id' => 'required|exists:room_types,id',
            'check_in_date' => 'required|date|after_or_equal:today',
            'check_out_date' => 'required|date|after:check_in_date',
            'payment_method' => 'nullable|in:midtrans,cash',
            'coupon_code' => 'nullable|string|max:50',
            'customer_name' => 'nullable|string|max:100',
            'customer_email' => 'nullable|email|max:150',
            'customer_phone' => 'nullable|string|max:30',
            'total_adults' => 'required|integer|min:1|max:10',
            'total_children' => 'nullable|integer|min:0|max:10',
            'special_requests' => 'nullable|string|max:1000',
            'extras' => 'nullable|array',
            'extras.*.id' => 'exists:extra_services,id',
            'extras.*.quantity' => 'nullable|integer|min:1',
        ]);

        try {
            $booking = $this->bookingService->createBooking($request->user(), $validated);

            return response()->json([
                'success' => true,
                'message' => 'Reservasi kamar berhasil dibuat. Silakan selesaikan pembayaran.',
                'data' => $booking->load(['roomType', 'extraItems', 'discountCoupon', 'latestPayment']),
            ], 201);
        } catch (Exception $e) {
            $message = $e->getMessage();
            $isOverbooked = str_contains($message, 'sudah dibooking orang lain')
                || str_contains($message, 'sudah tidak tersedia')
                || str_contains($message, 'sudah penuh');

            return response()->json([
                'success' => false,
                'error_code' => $isOverbooked ? 'ROOM_ALREADY_BOOKED' : 'BOOKING_FAILED',
                'message' => $isOverbooked ? 'Mohon maaf kamar sudah dibooking orang lain dan sudah tidak tersedia.' : $message,
            ], $isOverbooked ? 409 : 422);
        }
    }

    /**
     * Customer: View own bookings.
     */
    public function index(Request $request): JsonResponse
    {
        $bookings = Booking::with(['roomType', 'assignedRoom', 'extraItems', 'latestPayment', 'review'])
            ->where('user_id', $request->user()->id)
            ->orderBy('id', 'desc')
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $bookings,
        ]);
    }

    /**
     * Customer: View booking detail.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $booking = Booking::with([
            'roomType.amenities',
            'assignedRoom',
            'extraItems',
            'payments',
            'statusHistories',
            'review',
        ])->findOrFail($id);

        if (! $request->user()->isAdmin() && $booking->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $booking,
        ]);
    }

    /**
     * Customer cancel booking.
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $booking = Booking::findOrFail($id);

        // Only the guest who owns the booking can use this route. Staff cancel through
        // POST /admin/bookings/{id}/cancel, which needs the super admin cancellation key.
        if ($booking->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Akses ditolak.',
            ], 403);
        }

        if ($booking->status !== Booking::STATUS_PENDING_PAYMENT) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya booking yang belum dibayar yang dapat dibatalkan mandiri.',
            ], 422);
        }

        $reason = $request->input('reason', 'Dibatalkan oleh tamu.');
        $updated = $this->bookingService->cancelBooking($booking, $request->user(), $reason);

        return response()->json([
            'success' => true,
            'message' => 'Reservasi kamar berhasil dibatalkan.',
            'data' => $updated,
        ]);
    }

    /**
     * Admin: List all hotel bookings with filters.
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = Booking::with(['user', 'roomType', 'assignedRoom', 'latestPayment']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('room_type_id')) {
            $query->where('room_type_id', $request->room_type_id);
        }

        if ($request->filled('check_in_date')) {
            $query->where('check_in_date', $request->check_in_date);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('booking_code', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%")
                  ->orWhere('customer_email', 'like', "%{$search}%");
            });
        }

        $bookings = $query->orderBy('id', 'desc')->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $bookings,
        ]);
    }

    /**
     * Admin: Get available physical room units for assigning to a booking.
     */
    public function availableRoomsForBooking(int $id): JsonResponse
    {
        $booking = Booking::with('roomType')->findOrFail($id);
        $checkIn = Carbon::parse($booking->check_in_date);
        $checkOut = Carbon::parse($booking->check_out_date);

        $readyRooms = $this->availabilityService->getAvailablePhysicalRooms($booking->roomType, $checkIn, $checkOut);
        $allRooms = \App\Models\Room::where('room_type_id', $booking->room_type_id)
            ->orderBy('floor')
            ->orderBy('room_number')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'rooms' => $readyRooms,
                'available_rooms' => $readyRooms,
                'all_rooms' => $allRooms,
            ],
        ]);
    }

    /**
     * Admin: Check In guest & assign room.
     */
    public function checkIn(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
        ]);

        $booking = Booking::findOrFail($id);

        try {
            $updated = $this->bookingService->checkIn($booking, (int) $validated['room_id'], $request->user());

            return response()->json([
                'success' => true,
                'message' => 'Tamu berhasil check-in ke kamar.',
                'data' => $updated->load(['roomType', 'assignedRoom']),
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Admin: Check Out guest.
     */
    public function checkOut(Request $request, int $id): JsonResponse
    {
        $booking = Booking::findOrFail($id);

        try {
            $updated = $this->bookingService->checkOut($booking, $request->user());

            return response()->json([
                'success' => true,
                'message' => 'Tamu berhasil check-out. Kamar siap dibersihkan.',
                'data' => $updated->load(['roomType', 'assignedRoom']),
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Admin: Cancel booking with Super Admin Cancellation Key verification.
     */
    public function adminCancel(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'cancellation_key' => 'required|string',
            'reason' => 'required|string|max:500',
        ]);

        $inputKey = trim($validated['cancellation_key']);

        // Verify Key against Super Admin's active cancellation_key
        $superAdmin = User::where('role', 'super_admin')
            ->whereNotNull('cancellation_key')
            ->where('cancellation_key', $inputKey)
            ->first();

        if (! $superAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Key Konfirmasi Pembatalan salah atau tidak valid! Hubungi Super Admin / General Manager untuk mendapatkan Key Otorisasi.',
            ], 403);
        }

        $booking = Booking::findOrFail($id);

        if (in_array($booking->status, [Booking::STATUS_CANCELLED, Booking::STATUS_CHECKED_IN, Booking::STATUS_CHECKED_OUT])) {
            return response()->json([
                'success' => false,
                'message' => $booking->status === Booking::STATUS_CHECKED_IN
                    ? 'Tamu sedang menginap, reservasi tidak bisa dibatalkan. Lakukan check-out terlebih dahulu.'
                    : "Reservasi dengan status {$booking->status} tidak dapat dibatalkan lagi.",
            ], 422);
        }

        try {
            $updated = $this->bookingService->cancelBooking(
                $booking,
                $request->user(),
                $validated['reason'] . " (Diotorisasi dengan Key Super Admin [{$superAdmin->name}])"
            );

            // A paid booking gets a pending refund that the super admin processes on the Payments page
            $refund = \App\Models\Refund::whereHas('payment', fn ($q) => $q->where('booking_id', $booking->id))
                ->where('status', \App\Models\Refund::STATUS_PENDING)
                ->latest('id')
                ->first();

            $message = "Reservasi {$booking->booking_code} berhasil dibatalkan.";
            if ($refund) {
                $message .= ' Refund Rp ' . number_format((float) $refund->amount, 0, ',', '.')
                    . ' dicatat dan menunggu diproses di halaman Pembayaran.';
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $updated,
                'refund' => $refund,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}

