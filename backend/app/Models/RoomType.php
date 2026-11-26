<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class RoomType extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'hotel_id',
        'name',
        'slug',
        'description',
        'base_price_per_night',
        'weekend_price_per_night',
        'max_adults',
        'max_children',
        'room_size_sqm',
        'bed_type',
        'total_rooms',
        'is_active',
        'featured_image',
        'gallery_images',
    ];

    protected $appends = [
        'image_url',
    ];

    public function getImageUrlAttribute(): ?string
    {
        if (empty($this->featured_image)) {
            return null;
        }

        if (str_starts_with($this->featured_image, 'http://') || str_starts_with($this->featured_image, 'https://')) {
            return $this->featured_image;
        }

        return url('storage/' . ltrim($this->featured_image, '/'));
    }

    protected function casts(): array
    {
        return [
            'base_price_per_night' => 'decimal:2',
            'weekend_price_per_night' => 'decimal:2',
            'max_adults' => 'integer',
            'max_children' => 'integer',
            'room_size_sqm' => 'integer',
            'total_rooms' => 'integer',
            'is_active' => 'boolean',
            'gallery_images' => 'array',
        ];
    }

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }

    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class, 'room_type_amenity');
    }

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Calculate room cost across a date range.
     */
    public function calculateTotalRoomCost(Carbon $checkIn, Carbon $checkOut): array
    {
        $nights = $checkIn->diffInDays($checkOut) ?: 1;
        $totalCost = 0;
        $breakdown = [];

        $current = $checkIn->copy();
        while ($current->lt($checkOut)) {
            $isWeekend = in_array($current->dayOfWeek, [5, 6]); // Friday, Saturday nights
            $nightPrice = ($isWeekend && $this->weekend_price_per_night)
                ? (float) $this->weekend_price_per_night
                : (float) $this->base_price_per_night;

            $breakdown[] = [
                'date' => $current->toDateString(),
                'is_weekend' => $isWeekend,
                'price' => $nightPrice,
            ];

            $totalCost += $nightPrice;
            $current->addDay();
        }

        return [
            'nights' => $nights,
            'average_price' => round($totalCost / $nights, 2),
            'total_amount' => $totalCost,
            'breakdown' => $breakdown,
        ];
    }
}

