<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Services\HotelBookingService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class MarkNoShowBookingsCommand extends Command
{
    protected $signature = 'bookings:mark-no-show';
    protected $description = 'Automatically mark confirmed bookings whose stay dates have passed without check-in as NO_SHOW.';

    public function handle(HotelBookingService $bookingService): int
    {
        $today = Carbon::today();

        // Any confirmed booking where the checkout date has already arrived or passed without check-in
        $overdueBookings = Booking::where('status', Booking::STATUS_CONFIRMED)
            ->whereDate('check_out_date', '<=', $today)
            ->get();

        $count = 0;
        foreach ($overdueBookings as $booking) {
            try {
                $bookingService->markNoShow($booking, null, 'Otomatis ditandai No-Show oleh sistem karena melewati batas tanggal menginap.');
                $count++;
            } catch (\Throwable $e) {
                $this->error("Gagal menandai No-Show untuk booking {$booking->booking_code}: " . $e->getMessage());
            }
        }

        $this->info("Berhasil menandai {$count} reservasi terlewat menjadi No-Show.");

        return Command::SUCCESS;
    }
}

