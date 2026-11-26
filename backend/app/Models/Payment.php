<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
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
    // Booking was cancelled after payment; a Refund row waits for the super admin to process it
    public const STATUS_REFUND_PENDING = 'REFUND_PENDING';

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
        ];
    }

    /**
     * Sanitize provider_response attribute to protect sensitive cryptographic keys and merchant secrets.
     */
    protected function providerResponse(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if ($value === null) {
                    return null;
                }
                $data = is_string($value) ? json_decode($value, true) : $value;
                if (! is_array($data)) {
                    return $data;
                }

                unset(
                    $data['signature_key'],
                    $data['merchant_id'],
                    $data['approval_code']
                );

                if (isset($data['masked_card']) && is_string($data['masked_card'])) {
                    $digits = preg_replace('/\D/', '', $data['masked_card']);
                    if (strlen($digits) >= 8) {
                        $data['masked_card'] = substr($digits, 0, 4) . '-****-****-' . substr($digits, -4);
                    }
                }

                return $data;
            },
            set: function ($value) {
                if ($value === null) {
                    return null;
                }
                $data = is_string($value) ? json_decode($value, true) : $value;
                if (is_array($data)) {
                    unset(
                        $data['signature_key'],
                        $data['merchant_id'],
                        $data['approval_code']
                    );
                    return json_encode($data);
                }
                return $value;
            }
        );
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

