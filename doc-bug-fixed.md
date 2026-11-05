# Bug Fix Log

Bugs found and fixed while setting up and running the hotel booking project (Laravel 13 backend + React/Vite frontend).
Each entry lists the symptom, the cause, the fix, and what to learn from it.

| # | Area | Symptom | Type |
|---|------|---------|------|
| 1 | Environment | `php artisan` does not work | Setup |
| 2 | Composer | `composer install` fails: requires PHP >= 8.4.1 | Setup |
| 3 | Database | `Access denied for user ''@'localhost'` | Config |
| 4 | Frontend/CORS | Register fails with `net::ERR_FAILED` | Config |
| 5 | Admin dashboard | White page, `revenueTrend is not defined` | Code bug |
| 6 | Booking page | Price shows `NaN`, `calculate-price` returns 422 | Code bug |
| 7 | Midtrans | `401 Unauthorized`, popup never opens, fake "success" | Config |
| 8 | Midtrans | "Bayar" keeps using a fake token after the key is fixed | Behavior |
| 9 | Payment result | `payments/{id}` returns 500, "gagal memuat status pembayaran" | Code bug |
| 10 | Sandbox | Real phone or real bank app says the payment failed | Understanding |
| 11 | Sandbox | Simulator says "successful" but the booking stays PENDING | Understanding |
| 12 | UI | Static "15 minutes" text instead of a countdown | Improvement |

---

## 1. `php artisan` does not work (PHP not in PATH)

**Symptom:** The terminal cannot find `php`, so `php artisan serve` fails.

**Cause:** Laragon installs PHP in `D:\laragon\bin\php\php-8.3.16-Win32-vs16-x64`, but that folder is not in the terminal's `PATH`.

**Fix (temporary, current Git Bash window only):**
```bash
export PATH="/d/laragon/bin/php/php-8.3.16-Win32-vs16-x64:$PATH"
php -v
```
To make it permanent, add the same `export` line to `~/.bashrc`.

**Lesson:** "command not found" usually means the program is installed but its folder is missing from `PATH`. Git Bash uses Unix-style paths (`/d/...`), not `D:\...`.

---

## 2. `composer install` fails: PHP version too old

**Symptom:**
```
Your lock file does not contain a compatible set of packages. Please run composer update.
symfony/http-foundation v8.1.10 requires php >=8.4.1 -> your php version (8.3.16) does not satisfy that requirement.
```

**Cause:** `composer.lock` was created on a machine with PHP 8.4+, so it locked Symfony 8.x packages. This computer runs PHP 8.3.16.

**Fix:** Tell Composer to resolve packages for PHP 8.3.16, then update.
```bash
cd backend
composer config platform.php 8.3.16
composer update
```
Composer chose Symfony 7.4 packages, which Laravel 13 also supports (`^7.4.0 || ^8.0.0`).

**Side effect:** `composer.json` now contains `config.platform.php = 8.3.16` and `composer.lock` changed. Commit both only if the whole team uses PHP 8.3.

**Lesson:** `composer.lock` pins exact versions. When the PHP version differs between machines, the lock file may not install. Installing the matching PHP version is the other valid fix.

---

## 3. Database error: `Access denied for user ''@'localhost'`

**Symptom:** `php artisan migrate:fresh` fails with
```
SQLSTATE[HY000] [1045] Access denied for user ''@'localhost' ... Database: ,
```

**Cause:** `backend/.env` had empty `DB_DATABASE`, `DB_USERNAME` and `DB_PASSWORD`. Laravel tried to connect with no user and no database name. The empty `Database:` in the message is the clue.

**Fix:** Set the values in `backend/.env` (Laragon defaults), start MySQL in Laragon, create the database, then clear the config cache:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=booking-steve-system
DB_USERNAME=root
DB_PASSWORD=
```
```bash
php artisan config:clear
php artisan migrate --seed
```

**Lesson:** Read the whole error message. Empty values inside it (`''`, `Database: ,`) point to missing configuration. `migrate:fresh` deletes all tables, so use `migrate` for a first setup.

---

## 4. Register fails with `net::ERR_FAILED` (CORS)

**Symptom:** The browser console shows `POST http://localhost:8000/api/v1/register net::ERR_FAILED` with no HTTP status code.

**Cause:** Two `npm run dev` servers were running, on ports 5173 and 5174. The backend only allows requests from port 5173 (`backend/config/cors.php`). The page on 5174 was blocked by the browser (CORS). A missing status code is a typical CORS sign, because the browser never shows the response.

**Fix:** Stop the extra Vite process and open the site on the port that `cors.php` allows:
```bash
netstat -ano | grep -E ":(5173|5174) "
taskkill /PID <pid> /F
npm run dev
```
Then open `http://localhost:5173`. Alternative: add the other port to `allowed_origins` in `backend/config/cors.php`.

**Lesson:** The frontend and backend run on different ports, so they are different origins. The backend must list every frontend origin it trusts.

---

## 5. Admin dashboard turns white: `revenueTrend is not defined`

**File:** `frontend/src/pages/admin/AdminDashboardPage.jsx`

**Symptom:**
```
Uncaught ReferenceError: revenueTrend is not defined at AdminDashboardPage (AdminDashboardPage.jsx:235)
```
The page rendered, then went blank.

**Cause:** The API returns snake_case keys, and the component destructures them that way:
```js
const { revenue_trend = [], recent_bookings = [], ... } = data || {};
```
But the JSX used camelCase names that were never declared: `revenueTrend` and `recentBookings`.

**Fix:** Use the declared names.
```jsx
<AreaChart data={revenue_trend}>
{recent_bookings.length === 0 ? ( ... ) : ( recent_bookings.map((b) => { ... }) )}
```
Changed: line 235, line 278, line 281.

**Lesson:** A variable must be spelled exactly as it was declared. `revenue_trend` and `revenueTrend` are different variables. Search the file for other camelCase leftovers after a rename.

---

## 6. Price shows `NaN` and `calculate-price` returns 422

**File:** `frontend/src/pages/customer/BookingFlowPage.jsx` (line 70)

**Symptom:** The booking page shows `NaN` for the price. The console shows:
```
POST http://localhost:8000/api/v1/bookings/calculate-price 422 (Unprocessable Content)
```

**Cause:** Wrong response shape.
1. `api.js` returns `response.data`, so the call result is `{ success, data: { room_type, availability, cost } }`.
2. `RoomTypeController::show` puts the room inside `data.room_type`.
3. The page stored the whole `data` object as the room:
   ```js
   if (roomRes.data) setRoomType(roomRes.data);   // wrong
   ```
4. So `roomType.id` was `undefined`. The request was sent without `room_type_id`, and backend validation (`required|exists:room_types,id`) rejected it with 422.
5. `roomType.base_price_per_night` was also `undefined`, and `undefined * nights` gives `NaN`.

**Fix:**
```js
if (roomRes.data) setRoomType(roomRes.data.room_type);
```

**Lesson:**
- A 422 means validation failed. Open DevTools -> Network -> the failed request -> Response to see which field.
- When a value shows `NaN`, one of the numbers is `undefined`. Print the object (`console.log(roomRes)`) and check its real shape.
- Know how many layers wrap the data: axios (`.data`), the interceptor in `api.js`, and the Laravel response (`{ success, data }`).

---

## 7. Midtrans `401 Unauthorized` and a fake "success"

**Symptom:** Clicking "Bayar" flashes "success", opens a new tab, and then shows "gagal memuat status pembayaran". The log says:
```
Midtrans API is returning API error. HTTP status code: 401 API response: {"error":"Unauthorized"}
```

**Cause:** The Server Key in `backend/.env` was rejected by Midtrans. The keys had no `SB-` prefix (`Mid-server-...`). Sandbox keys start with `SB-Mid-server-` and `SB-Mid-client-`. Keys without `SB-` are normally production keys.

`MidtransService::createSnapToken()` hides this failure in sandbox mode. When Midtrans errors, it returns a fake `SANDBOX_FALLBACK_TOKEN_...`, and the frontend jumps straight to the result page. So the real Snap popup never opened.

**Fix:**
1. Copy the keys from Midtrans **Sandbox** environment -> Settings -> Access Keys. Use the copy button.
2. Put them in `backend/.env` (`MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`) and `frontend/.env` (`VITE_MIDTRANS_CLIENT_KEY`).
3. Run `php artisan config:clear`.
4. **Stop and restart `php artisan serve`.** It can keep the old `.env` values in memory.
5. Restart `npm run dev`. Vite reads `.env` only at start.

**How to check a key without printing it:** call the Midtrans API with the key and read only the HTTP code. 200 or 400 means the key is accepted. 401 means it is rejected.

**Lesson:** Never paste keys into chats, screenshots or git. A "silent fallback" in code can hide a real error, so always read `storage/logs/laravel.log`.

---

## 8. "Bayar" keeps using a fake token after the key is fixed

**Symptom:** The Server Key is correct now, but an old pending reservation still does not open the real popup.

**Cause:** `PaymentService::createCheckout()` reuses an existing pending payment that already has a `snap_token`. The old payment row holds the fake `SANDBOX_FALLBACK_...` token, so it is returned again and again.

**Fix:** Cancel the old pending reservation and create a new booking. The new booking gets a real token.

**Lesson:** After fixing a bug, old data created by the bug can still be wrong. Test with fresh data.

---

## 9. `payments/{id}` returns 500 (stale relations)

**File:** `backend/app/Http/Controllers/Api/V1/PaymentController.php` (`show`)

**Symptom:** The result page shows "gagal memuat status pembayaran". The log says:
```
Call to undefined relationship [service] on model [App\Models\Booking].
```

**Cause:** The project changed from service booking to hotel room booking. `Booking` now has `roomType`, `extraItems` and `assignedRoom`, but `show` still loaded the old relations `booking.service` and `booking.slot`.

**Fix:**
```php
// before
Payment::with(['booking.service', 'booking.slot', 'logs'])
// after
Payment::with(['booking.roomType', 'booking.extraItems', 'booking.assignedRoom', 'logs'])
```

**Same bug, second place:** `PaymentController::adminIndex` (the admin payments list) also loaded `booking.service`. It was fixed to `['booking.user', 'booking.roomType']`. It was found by searching the file for the old relation name after fixing `show`.

**Note:** The old `BookingController.php` still uses `service` and `slot`, but no route points to it any more. It is dead code. The active controller is `HotelBookingController`.

**Lesson:** After a big refactor, search the whole project for the old names (`grep -rn "service\|slot"`). The tests did not catch this because no test calls `payments/{id}`.

---

## 10. Real phone or real bank says the payment failed

**Symptom:** The Snap popup shows a GoPay QRIS code. Scanning it with a real GoPay, bank or e-wallet app fails. A real BSI banking app says the Virtual Account is unknown.

**Cause:** This is normal. Sandbox QR codes and Virtual Accounts are test data. Real apps and banks have no record of them. **No real money moves in sandbox.**

**What to do instead:**
- **Credit card (easiest, runs fully inside the popup):** card `4811 1111 1111 1114`, expiry any future date, CVV `123`, OTP `112233`.
- **Virtual Account:** choose a bank in the popup, copy the VA number, then pay it on that bank's page at `simulator.sandbox.midtrans.com`.

**Lesson:** Sandbox is a rehearsal. Only Midtrans' own simulator can "pay" a sandbox transaction.

---

## 11. Simulator says "successful" but the booking stays PENDING

**Symptom:** The Midtrans simulator showed "Simulated payment is successful" for a VA number, but the booking in the project stayed `PENDING`.

**Cause:** The VA number did not belong to any order of this project. It came from the Midtrans documentation page. Checking the orders at Midtrans showed they were all `qris` or did not exist (404). A VA exists at Midtrans only after you choose that bank in the popup.

**Fix:** Create the VA from your own order:
1. Click "Bayar" and choose Bank Transfer, for example BCA.
2. Copy the VA number from the popup.
3. Pay that same number on the matching bank page in the simulator.
4. Click "Check status".

**Also note:** `MidtransService.php` enables only `qris`, `gopay`, `shopeepay`, `bank_transfer`, `bca_va`, `bni_va`, `bri_va`, `mandiri_va`, `permata_va` and `credit_card`. BSI is not in the list.

**Lesson:** "The simulator says success" does not prove your order was paid. Check the transaction status for your own order ID.

---

## 12. Static "15 minutes" text replaced by a countdown

**File:** `frontend/src/pages/customer/CustomerDashboardPage.jsx`

**Before:** A pending booking showed the fixed text "Batas pembayaran 15 menit. Kamar diamankan sementara untuk Anda."

**After:** A `PaymentCountdown` component reads `expires_at` from the booking and shows a live `MM:SS` timer. At 00:00 it shows "Waktu pembayaran habis" and reloads the list. If `expires_at` is missing, the old text still shows.

**Lesson:** Compute countdowns from a server timestamp (`expires_at`), not from a hard-coded number. Clean up the `setInterval` in the `useEffect` return, or timers pile up.

---

## Tests

Run all tests with `php artisan test`. They use a temporary in-memory SQLite database, so your MySQL data is not touched. 28 tests pass.

| File | What it covers |
|---|---|
| `AuthTest`, `BookingEngineTest`, `ExampleTest` | register/login, booking price and overbooking, homepage |
| `MidtransWebhookTest` | a valid `settlement` webhook confirms the booking |
| `MidtransWebhookStatusTest` | pending, deny, expire, cancel, refund, card capture (accept and challenge), repeated delivery, invalid signature, amount mismatch, unknown order, missing order id |
| `PaymentShowTest` | `GET /payments/{id}` for owner, other customer (403), admin, guest (401), unknown id (404); admin payment list and status filter |
| `tests/Concerns/CreatesPendingPayment.php` | shared helper: a pending booking and payment, and a signed webhook payload |

`PaymentShowTest` is a regression test for bug 9. With the old `booking.service` code it fails with a 500, and with the fix it passes.

**Not covered yet:** `createCheckout` (calls Midtrans), `checkStatus` (calls Midtrans), and the whole frontend. Passing tests do not prove the app works. Bugs 5 and 6 were frontend bugs, and no test could see them.

**Browser tab titles:** `frontend/index.html` has the default title, and `src/App.jsx` has a `PAGE_TITLES` list that sets a title per route (for example "Reservasi Saya | The Royal Nusantara"). Add a line there for each new page.

---

## Debugging checklist for students

1. Read the full error message, including the file name and line number.
2. Check the backend log: `backend/storage/logs/laravel.log`.
3. Check the browser: Console tab for JavaScript errors, Network tab for API status and response.
4. After editing `.env`: run `php artisan config:clear` and restart `npm run dev`.
5. Keep both servers running: `php artisan serve` (port 8000) and `npm run dev` (port 5173).
