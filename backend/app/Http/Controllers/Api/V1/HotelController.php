<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ExtraService;
use App\Models\Hotel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HotelController extends Controller
{
    /**
     * Public: Get hotel profile information.
     */
    public function show(): JsonResponse
    {
        $hotel = Hotel::first();

        return response()->json([
            'success' => true,
            'data' => $hotel,
        ]);
    }

    /**
     * Public: Get available extra add-on services.
     */
    public function extraServices(): JsonResponse
    {
        $extras = ExtraService::where('is_active', true)->get();

        return response()->json([
            'success' => true,
            'data' => $extras,
        ]);
    }

    /**
     * Admin: Update hotel profile.
     */
    public function update(Request $request): JsonResponse
    {
        $hotel = Hotel::firstOrCreate(['id' => 1]);

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'tagline' => 'nullable|string|max:255',
            'star_rating' => 'required|integer|min:1|max:5',
            'address' => 'required|string',
            'city' => 'required|string|max:100',
            'phone' => 'required|string|max:30',
            'email' => 'required|email|max:100',
            'check_in_time' => 'required|string|max:10',
            'check_out_time' => 'required|string|max:10',
            'description' => 'nullable|string',
        ]);

        $hotel->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Profil hotel berhasil diperbarui.',
            'data' => $hotel,
        ]);
    }

    /**
     * Admin: Store new extra service.
     */
    public function storeExtraService(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'price_type' => 'required|in:per_booking,per_night,per_guest,per_stay',
            'icon' => 'nullable|string',
            'is_active' => 'boolean',
        ], [
            'price_type.in' => 'Model perhitungan tarif tidak valid. Pilih per masa inap atau per malam.',
            'price.required' => 'Harga add-on wajib diisi.',
            'price.numeric' => 'Harga add-on harus berupa angka nominal.',
            'price.min' => 'Harga add-on tidak boleh kurang dari 0.',
        ]);

        $extra = ExtraService::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Layanan tambahan berhasil dibuat.',
            'data' => $extra,
        ], 201);
    }

    /**
     * Admin: Update extra service.
     */
    public function updateExtraService(Request $request, int $id): JsonResponse
    {
        $extra = ExtraService::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'price_type' => 'required|in:per_booking,per_night,per_guest,per_stay',
            'icon' => 'nullable|string',
            'is_active' => 'boolean',
        ], [
            'price_type.in' => 'Model perhitungan tarif tidak valid. Pilih per masa inap atau per malam.',
            'price.required' => 'Harga add-on wajib diisi.',
            'price.numeric' => 'Harga add-on harus berupa angka nominal.',
            'price.min' => 'Harga add-on tidak boleh kurang dari 0.',
        ]);

        $extra->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Layanan tambahan berhasil diperbarui.',
            'data' => $extra,
        ]);
    }

    /**
     * Admin: Delete extra service.
     */
    public function destroyExtraService(int $id): JsonResponse
    {
        $extra = ExtraService::findOrFail($id);
        $extra->delete();

        return response()->json([
            'success' => true,
            'message' => 'Layanan tambahan berhasil dihapus.',
        ]);
    }
}

