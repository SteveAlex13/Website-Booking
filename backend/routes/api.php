<?php

use App\Http\Controllers\Api\V1\AdminDashboardController;
use App\Http\Controllers\Api\V1\AmenityController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CouponController;
use App\Http\Controllers\Api\V1\HotelBookingController;
use App\Http\Controllers\Api\V1\HotelController;
use App\Http\Controllers\Api\V1\MidtransWebhookController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\RefundController;
use App\Http\Controllers\Api\V1\ReviewController;
use App\Http\Controllers\Api\V1\RoomTypeController;
use App\Http\Controllers\Api\V1\RoomUnitController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // 1. Authentication (Public)
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    // 2. Hotel & Room Catalog (Public)
    Route::get('/hotel', [HotelController::class, 'show']);
    Route::get('/extra-services', [HotelController::class, 'extraServices']);
    Route::get('/amenities', [AmenityController::class, 'index']);
    Route::get('/room-types', [RoomTypeController::class, 'index']);
    Route::get('/room-types/{id}', [RoomTypeController::class, 'show']);
    Route::get('/room-types/{id}/reviews', [ReviewController::class, 'index']);
    Route::post('/bookings/calculate-price', [HotelBookingController::class, 'calculatePrice']);
    Route::get('/coupons/active', [CouponController::class, 'activeCoupons']);
    Route::post('/coupons/validate', [CouponController::class, 'validateCoupon']);

    // Backward compatibility aliases for existing frontend services
    Route::get('/services', [RoomTypeController::class, 'index']);
    Route::get('/services/{id}', [RoomTypeController::class, 'show']);

    // 3. Webhooks (Midtrans)
    Route::post('/webhooks/midtrans', [MidtransWebhookController::class, 'handle']);

    // 4. Authenticated Routes (Customer + Admin)
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'user']);
        Route::put('/user/profile', [AuthController::class, 'updateProfile']);
        Route::get('/user/cancellation-key', [AuthController::class, 'getCancellationKey']);
        Route::post('/user/generate-cancellation-key', [AuthController::class, 'generateCancellationKey']);

        // Customer Hotel Booking
        Route::post('/bookings', [HotelBookingController::class, 'store']);
        Route::get('/bookings', [HotelBookingController::class, 'index']);
        Route::get('/bookings/{id}', [HotelBookingController::class, 'show']);
        Route::post('/bookings/{id}/cancel', [HotelBookingController::class, 'cancel']);

        // Customer Reviews
        Route::post('/reviews', [ReviewController::class, 'store']);

        // Payments
        Route::post('/payments/checkout', [PaymentController::class, 'checkout']);
        Route::get('/payments/{id}', [PaymentController::class, 'show']);
        Route::get('/payments/{id}/status', [PaymentController::class, 'checkStatus']);

        // 5a. Front Desk (role admin) + Super Admin: daily hotel operations
        Route::prefix('admin')->middleware('role:admin,super_admin')->group(function () {
            // Dashboard (revenue fields are removed for front desk inside the controller)
            Route::get('/dashboard', [AdminDashboardController::class, 'dashboard']);

            // Read-only room type lists (used by the rooms and bookings pages)
            Route::get('/room-types', [RoomTypeController::class, 'adminIndex']);
            Route::get('/services', [RoomTypeController::class, 'adminIndex']);

            // Physical room units: list and change status only
            Route::get('/rooms', [RoomUnitController::class, 'index']);
            Route::patch('/rooms/{id}/status', [RoomUnitController::class, 'updateStatus']);

            // Bookings, check-in and check-out
            Route::get('/bookings', [HotelBookingController::class, 'adminIndex']);
            Route::get('/bookings/{id}', [HotelBookingController::class, 'show']);
            Route::get('/bookings/{id}/available-rooms', [HotelBookingController::class, 'availableRoomsForBooking']);
            Route::post('/bookings/{id}/check-in', [HotelBookingController::class, 'checkIn']);
            Route::post('/bookings/{id}/check-out', [HotelBookingController::class, 'checkOut']);

            // Guest book (read-only list of registered guests)
            Route::get('/customers', [AdminDashboardController::class, 'customers']);
        });

        // 5b. Super Admin only (CheckRole lets super_admin through and rejects admin)
        Route::prefix('admin')->middleware('role:super_admin')->group(function () {
            // Reports
            Route::get('/reports', [AdminDashboardController::class, 'reports']);

            // Hotel Profile & Add-ons
            Route::put('/hotel', [HotelController::class, 'update']);
            Route::post('/extra-services', [HotelController::class, 'storeExtraService']);
            Route::put('/extra-services/{id}', [HotelController::class, 'updateExtraService']);
            Route::delete('/extra-services/{id}', [HotelController::class, 'destroyExtraService']);

            // Amenities
            Route::post('/amenities', [AmenityController::class, 'store']);
            Route::delete('/amenities/{id}', [AmenityController::class, 'destroy']);

            // Room Types Management
            Route::post('/room-types', [RoomTypeController::class, 'store']);
            Route::put('/room-types/{id}', [RoomTypeController::class, 'update']);
            Route::delete('/room-types/{id}', [RoomTypeController::class, 'destroy']);

            // Compatibility with /admin/services
            Route::post('/services', [RoomTypeController::class, 'store']);
            Route::put('/services/{id}', [RoomTypeController::class, 'update']);
            Route::delete('/services/{id}', [RoomTypeController::class, 'destroy']);

            // Physical Room Units: create and delete
            Route::post('/rooms', [RoomUnitController::class, 'store']);
            Route::delete('/rooms/{id}', [RoomUnitController::class, 'destroy']);

            // Cancel a booking (still requires the cancellation key)
            Route::post('/bookings/{id}/cancel', [HotelBookingController::class, 'adminCancel']);

            // Payments and refunds
            Route::get('/payments', [PaymentController::class, 'adminIndex']);
            Route::post('/refunds/{id}/process', [RefundController::class, 'process']);

            // User management (guests, front desk, super admins)
            Route::get('/users', [UserController::class, 'index']);
            Route::post('/users', [UserController::class, 'store']);
            Route::put('/users/{id}', [UserController::class, 'update']);
            Route::patch('/users/{id}/toggle-active', [UserController::class, 'toggleActive']);

            // Discount Coupons Management
            Route::get('/coupons', [CouponController::class, 'index']);
            Route::post('/coupons', [CouponController::class, 'store']);
            Route::put('/coupons/{id}', [CouponController::class, 'update']);
            Route::patch('/coupons/{id}/toggle', [CouponController::class, 'toggleActive']);
            Route::delete('/coupons/{id}', [CouponController::class, 'destroy']);
        });
    });
});
