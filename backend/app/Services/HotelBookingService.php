<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingExtraItem;
use App\Models\BookingStatusHistory;
use App\Models\DiscountCoupon;
use App\Models\ExtraService;
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

            // 2. Check real inventory availability across the entire stay
            $availability = $this->availabilityService->checkRoomTypeAvailability($roomType, $checkIn, $checkOut);

            if (! $availability['is_available'] || $availability['available_rooms_count'] < 1) {
                throw new Exception('Maaf, kamar untuk tipe ini sudah penuh pada tanggal yang Anda pilih. Silakan pilih tanggal atau tipe kamar lain.');
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

            // 7. Booking code & Expiration (15 minutes)
            $bookingCode = $this->generateUniqueBookingCode();
            $expirationMinutes = (int) config('midtrans.booking_expiration_minutes', 15);
            $expiresAt = Carbon::now()->addMinutes($expirationMinutes);

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
                'special_requests' => $data['special_requests'] ?? null,
                'status' => Booking::STATUS_PENDING_PAYMENT,
                'expires_at' => $expiresAt,
            ]);

            // 8. Attach extra items
            foreach ($extraItemsToCreate as $item) {
                $booking->extraItems()->create($item);
            }

            // 9. Status history
            BookingStatusHistory::create([
                'booking_id' => $booking->id,
                'old_status' => null,
                'new_status' => Booking::STATUS_PENDING_PAYMENT,
                'changed_by' => $user->id,
                'note' => 'Reservasi hotel dibuat dan menunggu pembayaran via Midtrans Snap.',
            ]);

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

            return true;
        });
    }

    /**
     * Front desk: Check In guest & assign physical room.
     */
    public function checkIn(Booking $booking, int $roomId, ?User $admin = null): Booking
    {
        return DB::transaction(function () use ($booking, $roomId, $admin) {
            $locked = Booking::where('id', $booking->id)->lockForUpdate()->firstOrFail();
            $room = Room::where('id', $roomId)->lockForUpdate()->firstOrFail();

            $oldStatus = $locked->status;
            $locked->status = Booking::STATUS_CHECKED_IN;
            $locked->assigned_room_id = $room->id;
            $locked->checked_in_at = Carbon::now();
            $locked->save();

            $room->status = 'occupied';
            $room->save();

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

