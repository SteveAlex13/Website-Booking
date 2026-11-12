<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DiscountCoupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    /**
     * Get list of currently active public promo coupons.
     */
    public function activeCoupons(): JsonResponse
    {
        $coupons = DiscountCoupon::where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->where(function ($q) {
                $q->whereNull('usage_limit')
                    ->orWhereRaw('used_count < usage_limit');
            })
            ->select(['id', 'code', 'name', 'type', 'value', 'min_spend', 'max_discount'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $coupons,
        ]);
    }

    /**
     * Validate coupon code against an optional subtotal.
     */
    public function validateCoupon(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'subtotal' => 'nullable|numeric|min:0',
        ]);

        $code = strtoupper(trim($validated['code']));
        $subtotal = (float) ($validated['subtotal'] ?? 0);

        $coupon = DiscountCoupon::where('code', $code)->first();

        if (! $coupon) {
            return response()->json([
                'success' => false,
                'message' => "Kode diskon '{$code}' tidak ditemukan atau tidak valid.",
            ], 422);
        }

        $check = $coupon->checkValidity($subtotal);
        if (! $check['valid']) {
            return response()->json([
                'success' => false,
                'message' => $check['message'],
            ], 422);
        }

        $discountAmount = $coupon->calculateDiscount($subtotal);

        return response()->json([
            'success' => true,
            'message' => "Kupon '{$coupon->name}' berhasil digunakan!",
            'data' => [
                'id' => $coupon->id,
                'code' => $coupon->code,
                'name' => $coupon->name,
                'type' => $coupon->type,
                'value' => (float) $coupon->value,
                'discount_amount' => $discountAmount,
                'min_spend' => (float) $coupon->min_spend,
                'max_discount' => $coupon->max_discount ? (float) $coupon->max_discount : null,
            ],
        ]);
    }

    /**
     * Admin: List all coupons.
     */
    public function index(Request $request): JsonResponse
    {
        $query = DiscountCoupon::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $coupons = $query->orderBy('id', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $coupons,
        ]);
    }

    /**
     * Admin: Create a new discount coupon.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:discount_coupons,code',
            'name' => 'required|string|max:150',
            'type' => 'required|in:percentage,fixed',
            'value' => 'required|numeric|min:0.01',
            'min_spend' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'expires_at' => 'nullable|date',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));
        $validated['min_spend'] = $validated['min_spend'] ?? 0;
        $validated['is_active'] = $validated['is_active'] ?? true;

        if ($validated['type'] === 'percentage' && $validated['value'] > 100) {
            return response()->json([
                'success' => false,
                'message' => 'Nilai diskon persentase tidak boleh lebih dari 100%.',
            ], 422);
        }

        $coupon = DiscountCoupon::create($validated);

        return response()->json([
            'success' => true,
            'message' => "Kupon promo '{$coupon->code}' berhasil ditambahkan.",
            'data' => $coupon,
        ], 201);
    }

    /**
     * Admin: Update coupon details.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $coupon = DiscountCoupon::findOrFail($id);

        $validated = $request->validate([
            'code' => "required|string|max:50|unique:discount_coupons,code,{$id}",
            'name' => 'required|string|max:150',
            'type' => 'required|in:percentage,fixed',
            'value' => 'required|numeric|min:0.01',
            'min_spend' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'expires_at' => 'nullable|date',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));
        $validated['min_spend'] = $validated['min_spend'] ?? 0;

        if ($validated['type'] === 'percentage' && $validated['value'] > 100) {
            return response()->json([
                'success' => false,
                'message' => 'Nilai diskon persentase tidak boleh lebih dari 100%.',
            ], 422);
        }

        $coupon->update($validated);

        return response()->json([
            'success' => true,
            'message' => "Kupon promo '{$coupon->code}' berhasil diperbarui.",
            'data' => $coupon,
        ]);
    }

    /**
     * Admin: Toggle coupon active status.
     */
    public function toggleActive(int $id): JsonResponse
    {
        $coupon = DiscountCoupon::findOrFail($id);
        $coupon->is_active = ! $coupon->is_active;
        $coupon->save();

        $statusStr = $coupon->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return response()->json([
            'success' => true,
            'message' => "Kupon '{$coupon->code}' berhasil {$statusStr}.",
            'data' => $coupon,
        ]);
    }

    /**
     * Admin: Delete coupon.
     */
    public function destroy(int $id): JsonResponse
    {
        $coupon = DiscountCoupon::findOrFail($id);
        $code = $coupon->code;
        $coupon->delete();

        return response()->json([
            'success' => true,
            'message' => "Kupon promo '{$code}' berhasil dihapus.",
        ]);
    }
}

