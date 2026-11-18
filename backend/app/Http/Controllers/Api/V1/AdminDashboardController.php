<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Hotel;
use App\Models\Payment;
use App\Models\Room;
use App\Models\RoomType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    /**
     * Hotel Dashboard Statistics and KPI metrics.
     */
    public function dashboard(Request $request): JsonResponse
    {
        // Front desk (role admin) must not see financial data.
        $canSeeRevenue = $request->user()->isSuperAdmin();

        $today = Carbon::today()->toDateString();

        $totalRooms = Room::count();
        $occupiedRooms = Room::where('status', 'occupied')->count();
        $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 1) : 0;

        $totalCustomers = User::where('role', 'customer')->count();
        $totalRevenue = $canSeeRevenue
            ? Payment::where('status', Payment::STATUS_PAID)->sum('gross_amount')
            : 0;

        // Hotel Operations Today
        $expectedArrivalsToday = Booking::where('check_in_date', $today)
            ->whereIn('status', [Booking::STATUS_CONFIRMED])
            ->count();

        $expectedDeparturesToday = Booking::where('check_out_date', $today)
            ->where('status', Booking::STATUS_CHECKED_IN)
            ->count();

        $currentlyCheckedIn = Booking::where('status', Booking::STATUS_CHECKED_IN)->count();

        // Status breakdown
        $pendingPayments = Booking::where('status', Booking::STATUS_PENDING_PAYMENT)->count();
        $confirmedBookings = Booking::where('status', Booking::STATUS_CONFIRMED)->count();
        $checkedInCount = $currentlyCheckedIn;
        $checkedOutCount = Booking::where('status', Booking::STATUS_CHECKED_OUT)->count();
        $cancelledOrExpired = Booking::whereIn('status', [Booking::STATUS_CANCELLED, Booking::STATUS_EXPIRED])->count();

        // Room status distribution
        $roomStatuses = [
            'available' => Room::where('status', 'available')->count(),
            'occupied' => $occupiedRooms,
            'cleaning' => Room::where('status', 'cleaning')->count(),
            'maintenance' => Room::where('status', 'maintenance')->count(),
        ];

        // 7-day revenue trend
        $sevenDaysAgo = Carbon::today()->subDays(6);
        $revenueTrend = [];
        for ($i = 0; $canSeeRevenue && $i < 7; $i++) {
            $date = $sevenDaysAgo->copy()->addDays($i);
            $dateStr = $date->toDateString();
            $dayRevenue = Payment::where('status', Payment::STATUS_PAID)
                ->whereDate('paid_at', $dateStr)
                ->sum('gross_amount');
            $dayBookings = Booking::whereDate('created_at', $dateStr)->count();

            $revenueTrend[] = [
                'date' => $dateStr,
                'label' => $date->format('d M'),
                'revenue' => (float) $dayRevenue,
                'bookings' => $dayBookings,
            ];
        }

        $recentBookings = Booking::with(['roomType', 'assignedRoom', 'latestPayment'])
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get();

        $data = [
            'total_rooms' => $totalRooms,
            'occupied_rooms' => $occupiedRooms,
            'occupancy_rate' => $occupancyRate,
            'total_customers' => $totalCustomers,
            'expected_arrivals_today' => $expectedArrivalsToday,
            'expected_departures_today' => $expectedDeparturesToday,
            'currently_checked_in' => $currentlyCheckedIn,
            'room_statuses' => $roomStatuses,
            'status_breakdown' => [
                'pending_payment' => $pendingPayments,
                'confirmed' => $confirmedBookings,
                'checked_in' => $checkedInCount,
                'checked_out' => $checkedOutCount,
                'cancelled_or_expired' => $cancelledOrExpired,
            ],
            'recent_bookings' => $recentBookings,
        ];

        if ($canSeeRevenue) {
            $data['total_revenue'] = (float) $totalRevenue;
            $data['revenue_trend'] = $revenueTrend;
            $data['recent_payments'] = Payment::with('booking')
                ->orderBy('id', 'desc')
                ->limit(5)
                ->get();
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Reports and Analytics.
     */
    public function reports(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date', Carbon::today()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', Carbon::today()->toDateString());

        $bookingsQuery = Booking::whereBetween('created_at', [
            Carbon::parse($startDate)->startOfDay(),
            Carbon::parse($endDate)->endOfDay(),
        ]);

        if ($request->filled('room_type_id')) {
            $bookingsQuery->where('room_type_id', $request->room_type_id);
        }

        if ($request->filled('status')) {
            $bookingsQuery->where('status', $request->status);
        }

        $totalPeriodBookings = (clone $bookingsQuery)->count();

        $revenuePeriod = Payment::where('status', Payment::STATUS_PAID)
            ->whereBetween('paid_at', [
                Carbon::parse($startDate)->startOfDay(),
                Carbon::parse($endDate)->endOfDay(),
            ])
            ->sum('gross_amount');

        // Top booked room types
        $topRoomTypes = RoomType::withCount(['bookings' => function ($q) use ($startDate, $endDate) {
            $q->whereBetween('created_at', [
                Carbon::parse($startDate)->startOfDay(),
                Carbon::parse($endDate)->endOfDay(),
            ]);
        }])
        ->orderBy('bookings_count', 'desc')
        ->limit(5)
        ->get();

        $bookingsList = (clone $bookingsQuery)
            ->with(['roomType', 'user', 'latestPayment', 'assignedRoom'])
            ->orderBy('id', 'desc')
            ->limit(100)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'total_bookings' => $totalPeriodBookings,
                'total_revenue' => (float) $revenuePeriod,
                'top_services' => $topRoomTypes, // compatibility with frontend table
                'top_room_types' => $topRoomTypes,
                'bookings' => $bookingsList,
            ],
        ]);
    }

    /**
     * List registered customers.
     */
    public function customers(Request $request): JsonResponse
    {
        $query = User::where('role', 'customer')->withCount('bookings');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $customers = $query->orderBy('id', 'desc')->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $customers,
        ]);
    }
}
