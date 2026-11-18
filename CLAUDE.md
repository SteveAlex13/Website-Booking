# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Hotel room booking with online payment (Midtrans Snap). Two apps in one repo:

- `backend/`: Laravel 13 JSON API (PHP `^8.3`), Sanctum bearer-token auth, MySQL. Routes are under `/api/v1` (`routes/api.php`).
- `frontend/`: React 19 + Vite + Tailwind 4 SPA (`react-router-dom`, axios). UI text and API error messages are in Indonesian.

`README.md` is partly stale: it still describes a "Service Booking" system on Laravel 12. The project was converted to hotel room booking (see Legacy code below).

## Commands

Backend (run from `backend/`):

```bash
composer install && cp .env.example .env && php artisan key:generate
php artisan migrate --seed        # seeds hotel, room types, rooms, users (admin@booking.com / staff@booking.com / customer@booking.com, password `password123`)
php artisan serve                 # API on :8000 (restart it after editing .env; it does not pick up changes)
php artisan dev                   # or `composer dev`: runs the registered dev processes
php artisan test                  # whole suite
php artisan test --filter=MidtransWebhookTest          # one class or test name
php artisan test tests/Feature/PaymentShowTest.php     # one file
php artisan bookings:expire-pending                    # expire unpaid bookings now (scheduled every minute via routes/console.php; `php artisan schedule:work` locally)
```

Tests run on in-memory SQLite (`phpunit.xml`), never on the MySQL database, so `pdo_sqlite` must be enabled. Only `User` has a factory; tests build `Hotel`, `RoomType`, `Booking` and `Payment` rows by hand.

Frontend (run from `frontend/`):

```bash
npm install
npm run dev       # :5173
npm run build
npm run lint      # oxlint (react/rules-of-hooks is an error)
```

There are no frontend tests.

Env files: `backend/.env` (DB, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, `BOOKING_EXPIRATION_MINUTES`) and `frontend/.env` (`VITE_API_BASE_URL`, `VITE_MIDTRANS_CLIENT_KEY`, `VITE_MIDTRANS_IS_PRODUCTION`). Sandbox keys start with `SB-Mid-`.

## Environment gotchas

- CORS origins are hardcoded in `backend/config/cors.php` (`localhost:5173`, `127.0.0.1:5173`, `localhost:3000`). If Vite starts on another port (for example 5174 because an old dev server still runs), requests fail in the browser with `net::ERR_FAILED` and no status code.
- `backend/composer.lock` pins Symfony 8.x, which needs PHP >= 8.4.1. On PHP 8.3 `composer install` fails; locally use `composer config platform.php 8.3.16 && composer update`, and do not commit that change unless the team standardises on 8.3.
- On this Windows/Laragon machine `php` is not on the Git Bash `PATH` by default. The PHP folder is `/d/laragon/bin/php/php-8.3.16-Win32-vs16-x64` (the folder, not `php.exe`).

## Architecture

### Domain model (hotel)

`Hotel` has many `RoomType` (inventory counted by `total_rooms`; `base_price_per_night`, with `weekend_price_per_night` applied to Friday and Saturday nights in `RoomType::calculateTotalRoomCost`). `Room` rows are physical units and are only assigned at check-in (`Booking.assigned_room_id`). A `Booking` belongs to a `RoomType`, and has `BookingExtraItem`s (from `ExtraService` add-ons), an optional `DiscountCoupon`, `Payment`s (each with `PaymentLog`s and `Refund`s) and `BookingStatusHistory` rows.

Statuses (constants on `Booking` and `Payment`): `PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`, `EXPIRED`, `PAID_NO_SLOT` (paid after the hold expired and the room was taken by someone else).

### Booking and payment flow

1. `HotelBookingService::createBooking` runs in one transaction. It locks the `RoomType` row (`lockForUpdate`) to prevent overbooking, checks `RoomAvailabilityService`, prices the stay, applies the coupon, adds 10% tax and service on the discounted amount, and stores the booking as `PENDING_PAYMENT` with `expires_at = now + BOOKING_EXPIRATION_MINUTES` (default 15).
   - `payment_method = cash` is different: the booking is `CONFIRMED` immediately, the `Payment` has `order_id = CASH-{booking_code}`, and `expires_at` is the end of the check-in day.
2. `PaymentController::checkout` returns the Snap token via `PaymentService::createCheckout` and `MidtransService::createSnapToken`. An existing `PENDING` payment with a `snap_token` is reused instead of creating a new one.
3. The frontend opens the Snap popup (`frontend/src/utils/midtrans.js`). Midtrans then calls `POST /api/v1/webhooks/midtrans`, and the result page also calls `GET /payments/{id}/status`. Both end in `PaymentService::handleWebhook`, which verifies the SHA-512 signature (skipped for the status API path) and the amount, logs every call to `PaymentLog`, and maps the Midtrans `transaction_status` to `Payment` and `Booking` status under row locks. Delivery can repeat, so it must stay idempotent.
4. `ExpirePendingBookingsCommand` expires overdue `PENDING_PAYMENT` bookings through `HotelBookingService::expireBooking` and calls the Midtrans expire API (skipped for `CASH-` orders and placeholder keys).

Sandbox behaviour that is easy to misread:
- A server key containing `placeholder` makes `createSnapToken` return `SIMULATED_SNAP_TOKEN_...`, and the frontend skips the popup and goes to `PaymentResultPage`, which can post a `SIMULATED_SIGNATURE` webhook.
- With a real key, a failed Midtrans call (for example a 401 from a wrong key) is swallowed in non-production and replaced by `SANDBOX_FALLBACK_TOKEN_...`. Check `storage/logs/laravel.log` for the real error. Because of the token reuse in step 2, an old pending booking keeps its fake token after you fix the keys; create a new booking.
- Sandbox QR codes and Virtual Account numbers can only be paid with Midtrans simulators or test cards, never with a real app or bank.

### Auth and roles

Sanctum bearer tokens. The frontend keeps the token in `localStorage` (`auth_token`, `user_data`). Roles are plain strings on `users.role`: `customer`, `admin` (front desk / staff, `staff@booking.com`) and `super_admin`. `CheckRole` is the `role:` middleware alias; `super_admin` always passes it, so `role:super_admin` alone locks a route to super admin.

`routes/api.php` has two `admin` groups:
- `role:admin,super_admin` (front desk and super admin): dashboard, read-only room-type lists, room list and room status change, bookings list/detail/available-rooms, check-in, check-out, and the guest book (`GET /admin/customers`, read-only; there is no guest write endpoint).
- `role:super_admin`: reports, payments, coupons, hotel profile, extra services, amenities, room type writes, creating or deleting rooms, and `POST /admin/bookings/{id}/cancel` (also needs the super admin cancellation key).

`AdminDashboardController::dashboard` omits `total_revenue`, `revenue_trend` and `recent_payments` for front desk. `HotelBookingController::cancel` (customer route) is owner-only, so staff cannot bypass the cancellation key. `HotelBookingService::checkIn` requires a `CONFIRMED` booking and a room of the booked room type; `checkOut` requires `CHECKED_IN`. The frontend mirrors this: `RequireSuperAdmin` guards the super-admin-only routes in `App.jsx`, `AdminLayout` filters `navItems` by `superAdminOnly`, and pages hide write buttons with `useAuth().isSuperAdmin`. Hiding in the UI is only cosmetic; the middleware is the real rule. Other customer ownership checks live inside controllers (`user_id` match, or `User::isAdmin()` for staff), and `BookingPolicy` exists but is unused.

### API conventions

Responses look like `{ success, message?, data }`, and errors on `api/*` always render as JSON (`bootstrap/app.php`). The frontend axios instance (`frontend/src/services/api.js`) returns `response.data`, so a service call resolves to `{ success, data }` and components read `res.data`. A 401 clears the stored token and redirects to `/login`. Payloads are snake_case (a `roomType` relation serialises as `room_type`; the dashboard reads `revenue_trend`, `recent_bookings`). Some endpoints wrap several objects, for example `GET /room-types/{id}` returns `data: { room_type, availability, cost }`.

### Frontend layout

`src/App.jsx` defines all routes inside three layouts (`PublicLayout`, `CustomerLayout`, `AdminLayout`). API calls live in `src/services/*Service.js`, never directly in pages. Several admin pages kept their pre-conversion names: `AdminServicesPage` manages room types, `AdminCategoriesPage` manages add-on services, and `AdminSchedulesPage` is the hotel profile and policy page.

### Legacy code

The earlier service and time-slot booking system is still in the tree but is not routed: `Service`, `ServiceCategory`, `BookingSlot`, `BookingService`, `AvailabilityService`, and the controllers `BookingController`, `ServiceController`, `CategoryController`, `AvailabilityController`. The `/services` API routes are only aliases for `RoomTypeController`. New work belongs to `HotelBookingController`, `HotelBookingService` and `RoomAvailabilityService`. The `booking.service` and `booking.slot` relations no longer exist on `Booking`, so never eager load them.

`backend/CLAUDE.md` and `backend/AGENTS.md` are Laravel Boost bootstrap stubs that ask for `composer require laravel/boost --dev`. They are not project rules.
