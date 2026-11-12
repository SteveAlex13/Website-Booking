<?php

use App\Http\Controllers\Api\V1\AdminDashboardController;
use App\Http\Controllers\Api\V1\AmenityController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CouponController;
use App\Http\Controllers\Api\V1\HotelBookingController;
use App\Http\Controllers\Api\V1\HotelController;
use App\Http\Controllers\Api\V1\MidtransWebhookController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\ReviewController;
use App\Http\Controllers\Api\V1\RoomTypeController;
use App\Http\Controllers\Api\V1\RoomUnitController;
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

        // 5. Admin & Super Admin Protected Routes
        Route::prefix('admin')->middleware('role:admin,super_admin')->group(function () {
            // Dashboard & Analytics
            Route::get('/dashboard', [AdminDashboardController::class, 'dashboard']);
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
            Route::get('/room-types', [RoomTypeController::class, 'adminIndex']);
            Route::post('/room-types', [RoomTypeController::class, 'store']);
            Route::put('/room-types/{id}', [RoomTypeController::class, 'update']);
            Route::delete('/room-types/{id}', [RoomTypeController::class, 'destroy']);

            // Compatibility with /admin/services
            Route::get('/services', [RoomTypeController::class, 'adminIndex']);
            Route::post('/services', [RoomTypeController::class, 'store']);
            Route::put('/services/{id}', [RoomTypeController::class, 'update']);
            Route::delete('/services/{id}', [RoomTypeController::class, 'destroy']);

            // Physical Room Units Management
            Route::get('/rooms', [RoomUnitController::class, 'index']);
            Route::post('/rooms', [RoomUnitController::class, 'store']);
            Route::patch('/rooms/{id}/status', [RoomUnitController::class, 'updateStatus']);
            Route::delete('/rooms/{id}', [RoomUnitController::class, 'destroy']);

            // Hotel Front Desk & Bookings Management
            Route::get('/bookings', [HotelBookingController::class, 'adminIndex']);
            Route::get('/bookings/{id}', [HotelBookingController::class, 'show']);
            Route::get('/bookings/{id}/available-rooms', [HotelBookingController::class, 'availableRoomsForBooking']);
            Route::post('/bookings/{id}/check-in', [HotelBookingController::class, 'checkIn']);
            Route::post('/bookings/{id}/check-out', [HotelBookingController::class, 'checkOut']);
            Route::post('/bookings/{id}/cancel', [HotelBookingController::class, 'adminCancel']);

            // Customers & Payments
            Route::get('/customers', [AdminDashboardController::class, 'customers']);
            Route::get('/payments', [PaymentController::class, 'adminIndex']);

            // Discount Coupons Management
            Route::get('/coupons', [CouponController::class, 'index']);
            Route::post('/coupons', [CouponController::class, 'store']);
            Route::put('/coupons/{id}', [CouponController::class, 'update']);
            Route::patch('/coupons/{id}/toggle', [CouponController::class, 'toggleActive']);
            Route::delete('/coupons/{id}', [CouponController::class, 'destroy']);
        });
    });
});
