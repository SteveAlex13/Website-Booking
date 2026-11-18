<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoomUnitController extends Controller
{
    /**
     * List physical rooms with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Room::with('roomType');

        if ($request->filled('room_type_id')) {
            $query->where('room_type_id', $request->room_type_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('floor')) {
            $query->where('floor', $request->floor);
        }

        $rooms = $query->orderBy('floor')->orderBy('room_number')->get();

        return response()->json([
            'success' => true,
            'data' => $rooms,
        ]);
    }

    /**
     * Store a new room unit.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_type_id' => 'required|exists:room_types,id',
            'room_number' => 'required|string|max:20|unique:rooms,room_number',
            'floor' => 'required|integer|min:1',
            'status' => 'required|in:available,occupied,cleaning,maintenance',
        ]);

        $room = Room::create($validated);

        return response()->json([
            'success' => true,
            'message' => "Kamar No. {$room->room_number} berhasil ditambahkan.",
            'data' => $room->load('roomType'),
        ], 201);
    }

    /**
     * Update room unit status.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $room = Room::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:available,occupied,cleaning,maintenance',
        ]);

        // A room with a checked-in guest stays occupied until the guest checks out.
        if ($validated['status'] !== 'occupied') {
            $guest = $this->checkedInGuest($room);
            if ($guest) {
                return response()->json([
                    'success' => false,
                    'message' => "Kamar No. {$room->room_number} sedang dihuni tamu (booking {$guest->booking_code}). Lakukan check-out terlebih dahulu.",
                ], 422);
            }
        }

        $room->status = $validated['status'];
        $room->save();

        return response()->json([
            'success' => true,
            'message' => "Status Kamar No. {$room->room_number} diubah menjadi {$room->status}.",
            'data' => $room->load('roomType'),
        ]);
    }

    /**
     * Delete room unit.
     */
    public function destroy(int $id): JsonResponse
    {
        $room = Room::findOrFail($id);

        $guest = $this->checkedInGuest($room);
        if ($guest) {
            return response()->json([
                'success' => false,
                'message' => "Kamar No. {$room->room_number} sedang dihuni tamu (booking {$guest->booking_code}) dan tidak bisa dihapus.",
            ], 422);
        }

        $room->delete();

        return response()->json([
            'success' => true,
            'message' => 'Unit kamar berhasil dihapus.',
        ]);
    }

    /**
     * The booking of the guest who is staying in this room right now, if any.
     */
    private function checkedInGuest(Room $room): ?Booking
    {
        return Booking::where('assigned_room_id', $room->id)
            ->where('status', Booking::STATUS_CHECKED_IN)
            ->first();
    }
}

