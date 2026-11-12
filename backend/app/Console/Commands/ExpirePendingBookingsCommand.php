<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Payment;
use App\Services\HotelBookingService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Midtrans\Transaction as MidtransTransaction;

class ExpirePendingBookingsCommand extends Command
{
    protected $signature = 'bookings:expire-pending';
    protected $description = 'Expire pending bookings that have passed their expiration time, cancel Midtrans transactions, and safely release room capacity.';

    public function handle(HotelBookingService $bookingService): int
    {
        $expiredBookings = Booking::with('latestPayment')
            ->where('status', Booking::STATUS_PENDING_PAYMENT)
            ->where('expires_at', '<=', Carbon::now())
            ->get();

        $count = 0;
        foreach ($expiredBookings as $booking) {
            $bookingService->expireBooking($booking);

            // Cancel/expire remote Midtrans transaction so customer cannot pay overdue link (Section 8 Option B)
            $payment = $booking->latestPayment;
            if ($payment && $payment->order_id && ! str_starts_with($payment->order_id, 'CASH-')) {
                try {
                    $serverKey = config('midtrans.server_key');
                    if (! empty($serverKey) && ! str_contains($serverKey, 'placeholder')) {
                        MidtransTransaction::expire($payment->order_id);
                    }
                } catch (\Throwable $e) {
                    Log::warning("Could not cancel expired Midtrans transaction {$payment->order_id}: " . $e->getMessage());
                }
            }

            $count++;
        }

        $this->info("Successfully expired {$count} overdue bookings and released slot capacities.");

        return Command::SUCCESS;
    }
}

