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
}

