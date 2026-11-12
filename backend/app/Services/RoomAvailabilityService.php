<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Room;
use App\Models\RoomType;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class RoomAvailabilityService
{
    /**
     * Check if a room type has available rooms for the given date range.
     */
    public function checkRoomTypeAvailability(RoomType $roomType, Carbon $checkIn, Carbon $checkOut): array
    {
        $nights = $checkIn->diffInDays($checkOut) ?: 1;

        // Rooms under maintenance cannot be sold, so they do not count as stock.
        $maintenanceRooms = Room::where('room_type_id', $roomType->id)
            ->where('status', 'maintenance')
            ->count();
        $totalRooms = max(0, $roomType->total_rooms - $maintenanceRooms);

        // Find all active bookings that overlap with this date range
        $overlappingBookings = Booking::where('room_type_id', $roomType->id)
            ->whereIn('status', [
                Booking::STATUS_PENDING_PAYMENT,
                Booking::STATUS_CONFIRMED,
                Booking::STATUS_CHECKED_IN,
            ])
            ->where(function ($q) use ($checkIn, $checkOut) {
                $q->where('check_in_date', '<', $checkOut->toDateString())
                  ->where('check_out_date', '>', $checkIn->toDateString());
            })
            ->get();

        // Calculate max booked count on any single night in the range
        $maxBookedOnAnyNight = 0;
        $nightlyAvailability = [];

        $current = $checkIn->copy();
        while ($current->lt($checkOut)) {
            $dateStr = $current->toDateString();

            // Count bookings occupying this specific night
            $bookedCount = $overlappingBookings->filter(function ($b) use ($current) {
                $bIn = Carbon::parse($b->check_in_date);
                $bOut = Carbon::parse($b->check_out_date);
                return $current->gte($bIn) && $current->lt($bOut);
            })->count();

            $availableCount = max(0, $totalRooms - $bookedCount);
            if ($bookedCount > $maxBookedOnAnyNight) {
                $maxBookedOnAnyNight = $bookedCount;
            }

            $nightlyAvailability[] = [
                'date' => $dateStr,
                'total_rooms' => $totalRooms,
                'booked_count' => $bookedCount,
                'available_count' => $availableCount,
            ];

            $current->addDay();
        }

        $minAvailable = max(0, $totalRooms - $maxBookedOnAnyNight);

        return [
            'is_available' => $minAvailable > 0,
            'available_rooms_count' => $minAvailable,
            'total_rooms' => $totalRooms,
            'nights' => $nights,
            'nightly_details' => $nightlyAvailability,
        ];
    }

    /**
     * Find physical unassigned rooms for a room type during the dates.
     */
    public function getAvailablePhysicalRooms(RoomType $roomType, Carbon $checkIn, Carbon $checkOut): Collection
    {
        $occupiedRoomIds = Booking::where('room_type_id', $roomType->id)
            ->whereNotNull('assigned_room_id')
            ->whereIn('status', [
                Booking::STATUS_PENDING_PAYMENT,
                Booking::STATUS_CONFIRMED,
                Booking::STATUS_CHECKED_IN,
            ])
            ->where(function ($q) use ($checkIn, $checkOut) {
                $q->where('check_in_date', '<', $checkOut->toDateString())
                  ->where('check_out_date', '>', $checkIn->toDateString());
            })
            ->pluck('assigned_room_id')
            ->toArray();

        return Room::where('room_type_id', $roomType->id)
            ->whereNotIn('id', $occupiedRoomIds)
            ->whereNotIn('status', ['maintenance'])
            ->orderBy('floor')
            ->orderBy('room_number')
            ->get();
    }
}

