<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    use HasFactory;

    // Status Constants according to Section 6.2
    public const STATUS_PENDING = 'PENDING';
    public const STATUS_PAID = 'PAID';
    public const STATUS_FAILED = 'FAILED';
    public const STATUS_EXPIRED = 'EXPIRED';
    public const STATUS_CANCELLED = 'CANCELLED';
    public const STATUS_REFUNDED = 'REFUNDED';
    public const STATUS_PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED';
    public const STATUS_PAID_NO_SLOT = 'PAID_NO_SLOT';

    protected $fillable = [
        'booking_id',
        'order_id',
        'transaction_id',
        'snap_token',
        'payment_type',
        'gross_amount',
        'status',
        'provider_status',
        'fraud_status',
        'paid_at',
        'expired_at',
        'provider_response',
    ];

    protected function casts(): array
    {
        return [
            'gross_amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'expired_at' => 'datetime',
            'provider_response' => 'array',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(PaymentLog::class);
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }
}

