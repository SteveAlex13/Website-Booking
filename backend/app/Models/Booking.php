<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    use HasFactory;

    public const STATUS_PENDING_PAYMENT = 'PENDING_PAYMENT';
    public const STATUS_CONFIRMED = 'CONFIRMED';
    public const STATUS_CHECKED_IN = 'CHECKED_IN';
    public const STATUS_CHECKED_OUT = 'CHECKED_OUT';
    public const STATUS_CANCELLED = 'CANCELLED';
    public const STATUS_EXPIRED = 'EXPIRED';
    public const STATUS_PAID_NO_SLOT = 'PAID_NO_SLOT';

    protected $fillable = [
        'booking_code',
        'user_id',
        'room_type_id',
        'assigned_room_id',
        'customer_name',
        'customer_email',
        'customer_phone',
        'check_in_date',
        'check_out_date',
        'total_nights',
        'total_adults',
        'total_children',
        'room_price_per_night',
        'total_room_amount',
        'total_extras_amount',
        'tax_and_service_amount',
        'discount_coupon_id',
        'discount_code',
        'discount_amount',
        'total_amount',
        'payment_method',
        'special_requests',
        'status',
        'expires_at',
        'confirmed_at',
        'checked_in_at',
        'checked_out_at',
        'cancelled_at',
        'cancellation_reason',
    ];

    protected function casts(): array
    {
        return [
            'check_in_date' => 'date',
            'check_out_date' => 'date',
            'total_nights' => 'integer',
            'total_adults' => 'integer',
            'total_children' => 'integer',
            'room_price_per_night' => 'decimal:2',
            'total_room_amount' => 'decimal:2',
            'total_extras_amount' => 'decimal:2',
            'tax_and_service_amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'expires_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function roomType(): BelongsTo
    {
        return $this->belongsTo(RoomType::class);
    }

    public function discountCoupon(): BelongsTo
    {
        return $this->belongsTo(DiscountCoupon::class, 'discount_coupon_id');
    }

    public function assignedRoom(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'assigned_room_id');
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'assigned_room_id');
    }

    public function extraItems(): HasMany
    {
        return $this->hasMany(BookingExtraItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function latestPayment(): HasOne
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(BookingStatusHistory::class);
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    public function isPendingPayment(): bool
    {
        return $this->status === self::STATUS_PENDING_PAYMENT;
    }

    public function isConfirmed(): bool
    {
        return $this->status === self::STATUS_CONFIRMED;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    public function isExpired(): bool
    {
        return $this->status === self::STATUS_EXPIRED;
    }
}
