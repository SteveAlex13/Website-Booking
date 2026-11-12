<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Hotel;
use App\Models\RoomType;
use App\Services\RoomAvailabilityService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class RoomTypeController extends Controller
{
    public function __construct(
        protected RoomAvailabilityService $availabilityService
    ) {}

    /**
     * Public: Search and list room types with availability.
     */
    public function index(Request $request): JsonResponse
    {
        $checkInStr = $request->input('check_in', Carbon::today()->toDateString());
        $checkOutStr = $request->input('check_out', Carbon::tomorrow()->toDateString());
        $adults = max(1, (int) $request->input('adults', 1));
        $children = max(0, (int) $request->input('children', 0));

        $checkIn = Carbon::parse($checkInStr)->startOfDay();
        $checkOut = Carbon::parse($checkOutStr)->startOfDay();

        if ($checkOut->lte($checkIn)) {
            $checkOut = $checkIn->copy()->addDay();
        }

        $query = RoomType::with(['amenities', 'reviews'])
            ->where('is_active', true)
            ->where('max_adults', '>=', $adults);

        if ($request->filled('bed_type')) {
            $query->where('bed_type', $request->bed_type);
        }

        if ($request->filled('min_price')) {
            $query->where('base_price_per_night', '>=', $request->min_price);
        }

        if ($request->filled('max_price')) {
            $query->where('base_price_per_night', '<=', $request->max_price);
        }

        $roomTypes = $query->orderBy('base_price_per_night', 'asc')->get();

        // Calculate availability and price for requested dates
        $results = $roomTypes->map(function (RoomType $rt) use ($checkIn, $checkOut) {
            $availability = $this->availabilityService->checkRoomTypeAvailability($rt, $checkIn, $checkOut);
            $cost = $rt->calculateTotalRoomCost($checkIn, $checkOut);

            $averageRating = $rt->reviews->avg('rating');
            $reviewsCount = $rt->reviews->count();

            return [
                'id' => $rt->id,
                'name' => $rt->name,
                'slug' => $rt->slug,
                'description' => $rt->description,
                'base_price_per_night' => (float) $rt->base_price_per_night,
                'weekend_price_per_night' => $rt->weekend_price_per_night ? (float) $rt->weekend_price_per_night : null,
                'average_price_per_night' => $cost['average_price'],
                'total_stay_cost' => $cost['total_amount'],
                'nights' => $cost['nights'],
                'max_adults' => $rt->max_adults,
                'max_children' => $rt->max_children,
                'room_size_sqm' => $rt->room_size_sqm,
                'bed_type' => $rt->bed_type,
                'featured_image' => $rt->featured_image,
                'gallery_images' => $rt->gallery_images ?? [],
                'amenities' => $rt->amenities,
                'is_available' => $availability['is_available'],
                'available_rooms_count' => $availability['available_rooms_count'],
                'available_slots' => $availability['available_rooms_count'],
                'total_rooms' => $rt->total_rooms,
                'capacity' => $rt->total_rooms,
                'rating' => $averageRating ? round($averageRating, 1) : 5.0,
                'reviews_count' => $reviewsCount,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'check_in' => $checkIn->toDateString(),
                'check_out' => $checkOut->toDateString(),
                'nights' => $checkIn->diffInDays($checkOut),
                'adults' => $adults,
                'children' => $children,
                'room_types' => $results,
            ],
        ]);
    }

    /**
     * Public: Show room type detail.
     */
    public function show(string $idOrSlug, Request $request): JsonResponse
    {
        $roomType = RoomType::with(['hotel', 'amenities', 'reviews.user'])
            ->where(function ($q) use ($idOrSlug) {
                if (is_numeric($idOrSlug)) {
                    $q->where('id', $idOrSlug);
                } else {
                    $q->where('slug', $idOrSlug);
                }
            })
            ->firstOrFail();

        $checkInStr = $request->input('check_in', Carbon::today()->toDateString());
        $checkOutStr = $request->input('check_out', Carbon::tomorrow()->toDateString());

        $checkIn = Carbon::parse($checkInStr)->startOfDay();
        $checkOut = Carbon::parse($checkOutStr)->startOfDay();
        if ($checkOut->lte($checkIn)) {
            $checkOut = $checkIn->copy()->addDay();
        }

        $availability = $this->availabilityService->checkRoomTypeAvailability($roomType, $checkIn, $checkOut);
        $cost = $roomType->calculateTotalRoomCost($checkIn, $checkOut);

        return response()->json([
            'success' => true,
            'data' => [
                'room_type' => $roomType,
                'availability' => $availability,
                'cost' => $cost,
            ],
        ]);
    }

    /**
     * Admin: list all room types.
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = RoomType::with(['amenities'])->withCount(['rooms', 'bookings']);

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $roomTypes = $query->orderBy('id', 'desc')->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $roomTypes,
        ]);
    }

    /**
     * Admin: Store room type.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'base_price_per_night' => 'required|numeric|min:0',
            'weekend_price_per_night' => 'nullable|numeric|min:0',
            'max_adults' => 'required|integer|min:1|max:10',
            'max_children' => 'required|integer|min:0|max:10',
            'room_size_sqm' => 'required|integer|min:10',
            'bed_type' => 'required|string|max:100',
            'total_rooms' => 'required|integer|min:1',
            'is_active' => 'boolean',
            'amenities' => 'nullable|array',
            'amenities.*' => 'exists:amenities,id',
            'featured_image' => 'nullable|image|max:3072',
        ]);

        $hotel = Hotel::firstOrCreate(['id' => 1], [
            'name' => 'Grand Nusantara Luxury Resort',
            'city' => 'Jakarta',
            'address' => 'Jl. Sudirman No. 88',
            'phone' => '021-5551234',
            'email' => 'info@grandnusantara.com',
        ]);

        $slug = Str::slug($validated['name']);
        $originalSlug = $slug;
        $counter = 1;
        while (RoomType::where('slug', $slug)->exists()) {
            $slug = "{$originalSlug}-{$counter}";
            $counter++;
        }

        $imagePath = null;
        if ($request->hasFile('featured_image')) {
            $imagePath = $request->file('featured_image')->store('rooms', 'public');
        }

        $roomType = RoomType::create([
            'hotel_id' => $hotel->id,
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'base_price_per_night' => $validated['base_price_per_night'],
            'weekend_price_per_night' => $validated['weekend_price_per_night'] ?? null,
            'max_adults' => $validated['max_adults'],
            'max_children' => $validated['max_children'],
            'room_size_sqm' => $validated['room_size_sqm'],
            'bed_type' => $validated['bed_type'],
            'total_rooms' => $validated['total_rooms'],
            'is_active' => $validated['is_active'] ?? true,
            'featured_image' => $imagePath,
        ]);

        if (! empty($validated['amenities'])) {
            $roomType->amenities()->sync($validated['amenities']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Tipe kamar berhasil ditambahkan.',
            'data' => $roomType->load('amenities'),
        ], 201);
    }

    /**
     * Admin: Update room type.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $roomType = RoomType::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'base_price_per_night' => 'required|numeric|min:0',
            'weekend_price_per_night' => 'nullable|numeric|min:0',
            'max_adults' => 'required|integer|min:1|max:10',
            'max_children' => 'required|integer|min:0|max:10',
            'room_size_sqm' => 'required|integer|min:10',
            'bed_type' => 'required|string|max:100',
            'total_rooms' => 'required|integer|min:1',
            'is_active' => 'boolean',
            'amenities' => 'nullable|array',
            'featured_image' => 'nullable|image|max:3072',
        ]);

        if ($request->hasFile('featured_image')) {
            if ($roomType->featured_image && Storage::disk('public')->exists($roomType->featured_image)) {
                Storage::disk('public')->delete($roomType->featured_image);
            }
            $roomType->featured_image = $request->file('featured_image')->store('rooms', 'public');
        }

        $roomType->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'base_price_per_night' => $validated['base_price_per_night'],
            'weekend_price_per_night' => $validated['weekend_price_per_night'] ?? null,
            'max_adults' => $validated['max_adults'],
            'max_children' => $validated['max_children'],
            'room_size_sqm' => $validated['room_size_sqm'],
            'bed_type' => $validated['bed_type'],
            'total_rooms' => $validated['total_rooms'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        if (isset($validated['amenities'])) {
            $roomType->amenities()->sync($validated['amenities']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Tipe kamar berhasil diperbarui.',
            'data' => $roomType->load('amenities'),
        ]);
    }

    /**
     * Admin: Delete or archive room type.
     */
    public function destroy(int $id): JsonResponse
    {
        $roomType = RoomType::findOrFail($id);
        $roomType->is_active = false;
        $roomType->save();
        $roomType->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tipe kamar berhasil dinonaktifkan dan diarsipkan.',
        ]);
    }
}

