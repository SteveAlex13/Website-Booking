<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingExtraItem;
use App\Models\BookingStatusHistory;
use App\Models\DiscountCoupon;
use App\Models\ExtraService;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Room;
use App\Models\RoomType;
use App\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class HotelBookingService
{
    public function __construct(
        protected RoomAvailabilityService $availabilityService
    ) {}

    /**
     * Create a hotel room booking with concurrency locking.
     */
    public function createBooking(User $user, array $data): Booking
    {
        return DB::transaction(function () use ($user, $data) {
            $roomTypeId = (int) $data['room_type_id'];
            $checkIn = Carbon::parse($data['check_in_date'])->startOfDay();
            $checkOut = Carbon::parse($data['check_out_date'])->startOfDay();

            if ($checkOut->lte($checkIn)) {
                throw new Exception('Tanggal check-out harus setelah tanggal check-in.');
            }

            if ($checkIn->lt(Carbon::today())) {
                throw new Exception('Tanggal check-in tidak boleh di masa lampau.');
            }

            // 1. Lock room type row to prevent concurrent race condition overbooking
            $roomType = RoomType::where('id', $roomTypeId)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $roomType->is_active) {
                throw new Exception('Tipe kamar ini sedang tidak aktif.');
            }

            // Guests must fit in the room
            $adults = max(1, (int) ($data['total_adults'] ?? 1));
            $children = max(0, (int) ($data['total_children'] ?? 0));

            if ($roomType->max_adults && $adults > $roomType->max_adults) {
                throw new Exception("Jumlah dewasa melebihi kapasitas kamar ini (maksimal {$roomType->max_adults} dewasa).");
            }

            if ($children > (int) $roomType->max_children) {
                $maxChildren = (int) $roomType->max_children;
                $limit = $maxChildren > 0 ? "maksimal {$maxChildren} anak" : 'kamar ini tidak menerima anak-anak';
                throw new Exception("Jumlah anak melebihi kapasitas kamar ini ({$limit}).");
            }

            // 2. Check real inventory availability across the entire stay
            $availability = $this->availabilityService->checkRoomTypeAvailability($roomType, $checkIn, $checkOut);

            if (! $availability['is_available'] || $availability['available_rooms_count'] < 1) {
                throw new Exception('Mohon maaf kamar sudah dibooking orang lain dan sudah tidak tersedia.');
            }

            // 3. Calculate room cost across nights
            $costDetails = $roomType->calculateTotalRoomCost($checkIn, $checkOut);
            $totalRoomAmount = $costDetails['total_amount'];
            $nights = $costDetails['nights'];

            // 4. Calculate extra services add-ons
            $totalExtrasAmount = 0;
            $selectedExtras = $data['extras'] ?? [];
            $extraItemsToCreate = [];

            if (! empty($selectedExtras)) {
                foreach ($selectedExtras as $extraItem) {
                    $extraService = ExtraService::where('id', $extraItem['id'])
                        ->where('is_active', true)
                        ->first();

                    if ($extraService) {
                        $qty = max(1, (int) ($extraItem['quantity'] ?? 1));
                        $unitPrice = (float) $extraService->price;

                        if ($extraService->price_type === 'per_night') {
                            $subtotal = $unitPrice * $qty * $nights;
                        } else {
                            $subtotal = $unitPrice * $qty;
                        }

                        $totalExtrasAmount += $subtotal;
                        $extraItemsToCreate[] = [
                            'extra_service_id' => $extraService->id,
                            'name' => $extraService->name,
                            'price' => $unitPrice,
                            'quantity' => $qty,
                            'subtotal' => $subtotal,
                        ];
                    }
                }
            }

            // 5. Calculate discount (if coupon code provided)
            $subtotalBeforeTax = $totalRoomAmount + $totalExtrasAmount;
            $discountCouponId = null;
            $discountCode = null;
            $discountAmount = 0.0;

            if (! empty($data['coupon_code'])) {
                $code = strtoupper(trim($data['coupon_code']));
                $coupon = DiscountCoupon::where('code', $code)->lockForUpdate()->first();
                if ($coupon) {
                    $check = $coupon->checkValidity($subtotalBeforeTax);
                    if ($check['valid']) {
                        $discountCouponId = $coupon->id;
                        $discountCode = $coupon->code;
                        $discountAmount = $coupon->calculateDiscount($subtotalBeforeTax);
                        $coupon->increment('used_count');
                    }
                }
            }

            // 6. Calculate taxes and final total (10% tax on discounted amount)
            $taxableSubtotal = max(0.0, $subtotalBeforeTax - $discountAmount);
            $taxAndService = round($taxableSubtotal * 0.10, 2);
            $grandTotal = round($taxableSubtotal + $taxAndService, 2);

            $paymentMethod = $data['payment_method'] ?? 'midtrans';
            $isCash = ($paymentMethod === 'cash');

            // 7. Booking code & Expiration
            $bookingCode = $this->generateUniqueBookingCode();
            $expirationMinutes = (int) config('midtrans.booking_expiration_minutes', 15);
            $expiresAt = $isCash ? $checkIn->copy()->endOfDay() : Carbon::now()->addMinutes($expirationMinutes);
            $initialStatus = $isCash ? Booking::STATUS_CONFIRMED : Booking::STATUS_PENDING_PAYMENT;
            $confirmedAt = $isCash ? Carbon::now() : null;

            // 8. Persist Booking
            $booking = Booking::create([
                'booking_code' => $bookingCode,
                'user_id' => $user->id,
                'room_type_id' => $roomType->id,
                'discount_coupon_id' => $discountCouponId,
                'customer_name' => $data['customer_name'] ?? $user->name,
                'customer_email' => $data['customer_email'] ?? $user->email,
                'customer_phone' => $data['customer_phone'] ?? ($user->phone ?? '-'),
                'check_in_date' => $checkIn->toDateString(),
                'check_out_date' => $checkOut->toDateString(),
                'total_nights' => $nights,
                'total_adults' => max(1, (int) ($data['total_adults'] ?? 1)),
                'total_children' => max(0, (int) ($data['total_children'] ?? 0)),
                'room_price_per_night' => $costDetails['average_price'],
                'total_room_amount' => $totalRoomAmount,
                'total_extras_amount' => $totalExtrasAmount,
                'discount_code' => $discountCode,
                'discount_amount' => $discountAmount,
                'tax_and_service_amount' => $taxAndService,
                'total_amount' => $grandTotal,
                'payment_method' => $paymentMethod,
                'special_requests' => $data['special_requests'] ?? null,
                'status' => $initialStatus,
                'confirmed_at' => $confirmedAt,
                'expires_at' => $expiresAt,
            ]);

            // 9. Attach extra items
            foreach ($extraItemsToCreate as $item) {
                $booking->extraItems()->create($item);
            }

            // 10. Handle Cash vs Midtrans payment initialization
            if ($isCash) {
                Payment::create([
                    'booking_id' => $booking->id,
                    'order_id' => "CASH-{$bookingCode}",
                    'payment_type' => 'cash',
                    'gross_amount' => $grandTotal,
                    'status' => Payment::STATUS_PENDING,
                    'provider_status' => 'pay_at_hotel',
                    'expired_at' => $expiresAt,
                ]);

                BookingStatusHistory::create([
                    'booking_id' => $booking->id,
                    'old_status' => null,
                    'new_status' => Booking::STATUS_CONFIRMED,
                    'changed_by' => $user->id,
                    'note' => 'Reservasi dibuat dengan metode Bayar di Tempat. Menunggu pelunasan saat Check-In.',
                ]);
            } else {
                BookingStatusHistory::create([
                    'booking_id' => $booking->id,
                    'old_status' => null,
                    'new_status' => Booking::STATUS_PENDING_PAYMENT,
                    'changed_by' => $user->id,
                    'note' => 'Reservasi hotel dibuat dan menunggu pembayaran via Midtrans Snap.',
                ]);
            }

            return $booking;
        });
    }

    /**
     * Cancel hotel booking.
     */
    public function cancelBooking(Booking $booking, ?User $changedBy = null, ?string $reason = null): Booking
    {
        return DB::transaction(function () use ($booking, $changedBy, $reason) {
            $locked = Booking::where('id', $booking->id)->lockForUpdate()->firstOrFail();

            if (in_array($locked->status, [Booking::STATUS_CANCELLED, Booking::STATUS_EXPIRED])) {
                return $locked;
            }

            // A guest who is already in the room (or has left) cannot be cancelled.
            if ($locked->status === Booking::STATUS_CHECKED_IN) {
                throw new Exception('Tamu sedang menginap, reservasi tidak bisa dibatalkan. Lakukan check-out terlebih dahulu.');
            }

            if ($locked->status === Booking::STATUS_CHECKED_OUT) {
                throw new Exception('Reservasi yang sudah check-out tidak bisa dibatalkan.');
            }

            $oldStatus = $locked->status;
            $locked->status = Booking::STATUS_CANCELLED;
            $locked->cancelled_at = Carbon::now();
            $locked->cancellation_reason = $reason ?? 'Dibatalkan oleh tamu/admin.';

            // Free physical room if was assigned
            if ($locked->assigned_room_id) {
                Room::where('id', $locked->assigned_room_id)->update(['status' => 'available']);
                $locked->assigned_room_id = null;
            }

            $locked->save();

            BookingStatusHistory::create([
                'booking_id' => $locked->id,
                'old_status' => $oldStatus,
                'new_status' => Booking::STATUS_CANCELLED,
                'changed_by' => $changedBy?->id,
                'note' => $locked->cancellation_reason,
            ]);

            $this->releaseCouponUse($locked);
            $this->openRefundIfPaid($locked);

            return $locked;
        });
    }

    /**
     * Expire pending booking.
     */
    public function expireBooking(Booking $booking): bool
    {
        return DB::transaction(function () use ($booking) {
            $locked = Booking::where('id', $booking->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== Booking::STATUS_PENDING_PAYMENT) {
                return false;
            }

            $oldStatus = $locked->status;
            $locked->status = Booking::STATUS_EXPIRED;
            $locked->save();

            BookingStatusHistory::create([
                'booking_id' => $locked->id,
                'old_status' => $oldStatus,
                'new_status' => Booking::STATUS_EXPIRED,
                'changed_by' => null,
                'note' => 'Batas waktu pembayaran habis (Expired). Slot kamar otomatis dilepas.',
            ]);

            $this->releaseCouponUse($locked);

            return true;
        });
    }

    /**
     * Give the coupon quota back when a booking that used a coupon is cancelled or expires.
     * Each booking reaches cancelled/expired only once, so the quota is never returned twice.
     */
    protected function releaseCouponUse(Booking $booking): void
    {
        if (! $booking->discount_coupon_id) {
            return;
        }

        DiscountCoupon::where('id', $booking->discount_coupon_id)
            ->where('used_count', '>', 0)
            ->decrement('used_count');
    }

    /**
     * If the guest already paid, record a refund for the super admin to process.
     * The payment leaves PAID so it no longer counts as revenue.
     */
    protected function openRefundIfPaid(Booking $booking): void
    {
        $payment = Payment::where('booking_id', $booking->id)
            ->whereIn('status', [Payment::STATUS_PAID, Payment::STATUS_PAID_NO_SLOT])
            ->latest('id')
            ->first();

        if (! $payment) {
            return;
        }

        Refund::create([
            'payment_id' => $payment->id,
            'amount' => $payment->gross_amount,
            'reason' => $booking->cancellation_reason,
            'status' => Refund::STATUS_PENDING,
        ]);

        $payment->status = Payment::STATUS_REFUND_PENDING;
        $payment->save();
    }

    /**
     * Front desk: Check In guest & assign physical room.
     */
    public function checkIn(Booking $booking, int $roomId, ?User $admin = null): Booking
    {
        return DB::transaction(function () use ($booking, $roomId, $admin) {
            $locked = Booking::where('id', $booking->id)->lockForUpdate()->firstOrFail();
            $room = Room::where('id', $roomId)->lockForUpdate()->firstOrFail();

            if ($locked->status !== Booking::STATUS_CONFIRMED) {
                throw new Exception('Check-in hanya bisa dilakukan untuk reservasi yang sudah terkonfirmasi (lunas atau bayar di tempat).');
            }

            // Check-in is only allowed during the booked stay (from the check-in date until the day before check-out)
            $today = Carbon::today();
            $stayStart = $locked->check_in_date->copy()->startOfDay();
            $stayEnd = $locked->check_out_date->copy()->startOfDay();

            if ($today->lt($stayStart)) {
                throw new Exception('Belum waktunya check-in. Tanggal check-in reservasi ini adalah ' . $stayStart->format('d-m-Y') . '.');
            }

            if ($today->gte($stayEnd)) {
                throw new Exception('Masa menginap reservasi ini sudah lewat (check-out ' . $stayEnd->format('d-m-Y') . '). Check-in tidak bisa dilakukan.');
            }

            if ((int) $room->room_type_id !== (int) $locked->room_type_id) {
                throw new Exception("Kamar No. {$room->room_number} bukan tipe kamar yang dipesan tamu. Pilih unit kamar dengan tipe yang sama.");
            }

            if ($room->status !== 'available') {
                $statusLabels = [
                    'occupied' => 'Terisi (Occupied)',
                    'cleaning' => 'Sedang Dibersihkan (Cleaning)',
                    'maintenance' => 'Perbaikan (Maintenance)',
                ];
                $currentLabel = $statusLabels[$room->status] ?? $room->status;
                throw new Exception("Kamar No. {$room->room_number} saat ini tidak siap untuk Check-In (Status: {$currentLabel}). Silakan pilih unit kamar fisik yang berstatus Tersedia (Ready Clean).");
            }

            $oldStatus = $locked->status;
            $locked->status = Booking::STATUS_CHECKED_IN;
            $locked->assigned_room_id = $room->id;
            $locked->checked_in_at = Carbon::now();
            $locked->save();

            $room->status = 'occupied';
            $room->save();

            // Settle pending cash payment if booking was cash on arrival
            $cashPayment = Payment::where('booking_id', $locked->id)
                ->where('payment_type', 'cash')
                ->where('status', Payment::STATUS_PENDING)
                ->first();

            if ($cashPayment) {
                $cashPayment->status = Payment::STATUS_PAID;
                $cashPayment->paid_at = Carbon::now();
                $cashPayment->provider_status = 'settled_at_front_desk';
                $cashPayment->save();
            }

            BookingStatusHistory::create([
                'booking_id' => $locked->id,
                'old_status' => $oldStatus,
                'new_status' => Booking::STATUS_CHECKED_IN,
                'changed_by' => $admin?->id,
                'note' => "Tamu check-in ke Kamar No. {$room->room_number} (Lantai {$room->floor}).",
            ]);

            return $locked;
        });
    }

    /**
     * Front desk: Check Out guest.
     */
    public function checkOut(Booking $booking, ?User $admin = null): Booking
    {
        return DB::transaction(function () use ($booking, $admin) {
            $locked = Booking::where('id', $booking->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== Booking::STATUS_CHECKED_IN) {
                throw new Exception('Check-out hanya bisa dilakukan untuk tamu yang sedang check-in.');
            }

            $oldStatus = $locked->status;
            $locked->status = Booking::STATUS_CHECKED_OUT;
            $locked->checked_out_at = Carbon::now();
            $locked->save();

            if ($locked->assigned_room_id) {
                $room = Room::where('id', $locked->assigned_room_id)->first();
                if ($room) {
                    $room->status = 'cleaning';
                    $room->save();
                }
            }

            BookingStatusHistory::create([
                'booking_id' => $locked->id,
                'old_status' => $oldStatus,
                'new_status' => Booking::STATUS_CHECKED_OUT,
                'changed_by' => $admin?->id,
                'note' => 'Tamu telah check-out. Status kamar diubah ke cleaning.',
            ]);

            return $locked;
        });
    }

    protected function generateUniqueBookingCode(): string
    {
        $datePrefix = Carbon::now()->format('Ymd');
        do {
            $random = strtoupper(Str::random(5));
            $code = "HTL-{$datePrefix}-{$random}";
        } while (Booking::where('booking_code', $code)->exists());

        return $code;
    }
}

