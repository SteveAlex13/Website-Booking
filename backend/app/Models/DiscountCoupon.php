<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiscountCoupon extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'type',
        'value',
        'min_spend',
        'max_discount',
        'usage_limit',
        'used_count',
        'expires_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'min_spend' => 'decimal:2',
            'max_discount' => 'decimal:2',
            'expires_at' => 'datetime',
            'is_active' => 'boolean',
            'usage_limit' => 'integer',
            'used_count' => 'integer',
        ];
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Check if coupon is currently valid for a given subtotal.
     */
    public function checkValidity(float $subtotal = 0): array
    {
        if (! $this->is_active) {
            return ['valid' => false, 'message' => 'Kupon diskon ini sudah tidak aktif.'];
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            return ['valid' => false, 'message' => 'Kupon diskon ini sudah kedaluwarsa.'];
        }

        if ($this->usage_limit !== null && $this->used_count >= $this->usage_limit) {
            return ['valid' => false, 'message' => 'Batas kuota kupon diskon ini telah tercapai.'];
        }

        if ($this->min_spend > 0 && $subtotal < (float) $this->min_spend) {
            $formattedMin = number_format($this->min_spend, 0, ',', '.');
            return ['valid' => false, 'message' => "Minimal total transaksi untuk kupon ini adalah Rp {$formattedMin}."];
        }

        return ['valid' => true, 'message' => 'Kupon berhasil diterapkan!'];
    }

    /**
     * Calculate discount amount for a given subtotal.
     */
    public function calculateDiscount(float $subtotal): float
    {
        if ($subtotal <= 0) {
            return 0.0;
        }

        if ($this->type === 'percentage') {
            $discount = ($subtotal * (float) $this->value) / 100.0;
            if ($this->max_discount !== null && $this->max_discount > 0) {
                $discount = min($discount, (float) $this->max_discount);
            }
            return round($discount, 2);
        }

        // Fixed discount
        return round(min((float) $this->value, $subtotal), 2);
    }
}

