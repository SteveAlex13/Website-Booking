<?php

namespace Database\Seeders;

use App\Models\Amenity;
use App\Models\Booking;
use App\Models\BookingStatusHistory;
use App\Models\ExtraService;
use App\Models\Hotel;
use App\Models\Payment;
use App\Models\Room;
use App\Models\RoomType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Users
        $superAdmin = User::updateOrCreate(
            ['email' => 'admin@booking.com'],
            [
                'name' => 'General Manager',
                'phone' => '081234567890',
                'password' => Hash::make('password123'),
                'role' => 'super_admin',
                'email_verified_at' => now(),
            ]
        );

        $staffAdmin = User::updateOrCreate(
            ['email' => 'staff@booking.com'],
            [
                'name' => 'Front Desk Receptionist',
                'phone' => '081234567891',
                'password' => Hash::make('password123'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ]
        );

        $customer = User::updateOrCreate(
            ['email' => 'customer@booking.com'],
            [
                'name' => 'Budi Santoso',
                'phone' => '081234567892',
                'password' => Hash::make('password123'),
                'role' => 'customer',
                'email_verified_at' => now(),
            ]
        );

        // 2. Hotel Profile
        $hotel = Hotel::updateOrCreate(
            ['id' => 1],
            [
                'name' => 'The Royal Nusantara Resort & Luxury Suites',
                'tagline' => 'Pengalaman Menginap Mewah Tepi Pantai Berbintang Lima',
                'star_rating' => 5,
                'address' => 'Jl. Pantai Indah Nirwana No. 88, Nusa Dua',
                'city' => 'Bali & Jakarta',
                'phone' => '+62 361 889900',
                'email' => 'reservation@royalnusantara.com',
                'check_in_time' => '14:00',
                'check_out_time' => '12:00',
                'description' => 'The Royal Nusantara menawarkan akomodasi bintang 5 kelas dunia dengan panorama matahari terbenam memukau, kolam renang infinity tepi laut, spa relaksasi tradisional, serta layanan pelayan pribadi 24 jam.',
                'policies' => [
                    'check_in' => 'Check-in mulai pukul 14:00 WITA. Early check-in tergantung ketersediaan kamar.',
                    'check_out' => 'Check-out maksimal pukul 12:00 WITA.',
                    'cancellation' => 'Pembatalan gratis hingga 24 jam sebelum kedatangan.',
                    'pets' => 'Hewan peliharaan tidak diperkenankan demi kenyamanan bersama.',
                ],
            ]
        );

        // 3. Amenities
        $amenitiesData = [
            ['name' => 'WiFi Berkecepatan Tinggi', 'icon' => 'Wifi', 'category' => 'room'],
            ['name' => 'Bathtub & Jacuzzi Pribadi', 'icon' => 'Bath', 'category' => 'bathroom'],
            ['name' => 'Balkon Pemandangan Laut', 'icon' => 'Sun', 'category' => 'room'],
            ['name' => 'Sarapan Prasmanan Termasuk', 'icon' => 'Coffee', 'category' => 'hotel'],
            ['name' => 'Smart LED TV 55" Netflix', 'icon' => 'Tv', 'category' => 'entertainment'],
            ['name' => 'Mesin Kopi Espresso Kapsul', 'icon' => 'Coffee', 'category' => 'room'],
            ['name' => 'AC Pendingin Suhu Otomatis', 'icon' => 'Wind', 'category' => 'room'],
            ['name' => 'Minibar & Kulkas Kecil', 'icon' => 'Refrigerator', 'category' => 'room'],
            ['name' => 'Brankas Elektronik (Safe Box)', 'icon' => 'ShieldCheck', 'category' => 'room'],
            ['name' => 'Jubah Mandi & Sandal Hotel', 'icon' => 'Smile', 'category' => 'bathroom'],
        ];

        $amenityIds = [];
        foreach ($amenitiesData as $amenity) {
            $created = Amenity::updateOrCreate(
                ['name' => $amenity['name']],
                $amenity
            );
            $amenityIds[] = $created->id;
        }

        // 4. Room Types & Physical Rooms
        $roomTypesData = [
            [
                'name' => 'Deluxe Ocean View King Room',
                'slug' => 'deluxe-ocean-view-king-room',
                'description' => 'Kamar modern seluas 38 meter persegi dengan ranjang King size, balkon pribadi menghadap panorama samudra biru, dan kamar mandi marmer mewah.',
                'base_price_per_night' => 10000,
                'weekend_price_per_night' => 10000,
                'max_adults' => 2,
                'max_children' => 1,
                'room_size_sqm' => 38,
                'bed_type' => '1 King Bed',
                'total_rooms' => 6,
                'rooms' => ['101', '102', '103', '104', '105', '106'],
                'floor' => 1,
            ],
            [
                'name' => 'Executive Twin Garden Suite',
                'slug' => 'executive-twin-garden-suite',
                'description' => 'Suite elegan berkapasitas 2 tempat tidur Twin, area santai terpisah, dan akses langsung ke taman tropis yang asri dan menenangkan.',
                'base_price_per_night' => 1150000,
                'weekend_price_per_night' => 1250000,
                'max_adults' => 2,
                'max_children' => 2,
                'room_size_sqm' => 48,
                'bed_type' => '2 Twin Beds',
                'total_rooms' => 5,
                'rooms' => ['201', '202', '203', '204', '205'],
                'floor' => 2,
            ],
            [
                'name' => 'Royal Honeymoon Suite with Jacuzzi',
                'slug' => 'royal-honeymoon-suite-with-jacuzzi',
                'description' => 'Kamar impian pasangan dengan Jacuzzi pribadi di teras terbuka, ranjang Super King berbalut seprai linen sutra, serta dekorasi bunga romantis.',
                'base_price_per_night' => 1950000,
                'weekend_price_per_night' => 2200000,
                'max_adults' => 2,
                'max_children' => 0,
                'room_size_sqm' => 65,
                'bed_type' => '1 Super King Bed',
                'total_rooms' => 4,
                'rooms' => ['301', '302', '303', '304'],
                'floor' => 3,
            ],
            [
                'name' => 'Presidential Ocean Penthouse Suite',
                'slug' => 'presidential-ocean-penthouse-suite',
                'description' => 'Kemewahan puncak di lantai teratas dengan ruang tamu privat, meja makan keluarga, dapur mini, dua kamar tidur master, dan layanan pelayan 24 jam.',
                'base_price_per_night' => 3800000,
                'weekend_price_per_night' => 4200000,
                'max_adults' => 4,
                'max_children' => 2,
                'room_size_sqm' => 120,
                'bed_type' => '2 King Beds',
                'total_rooms' => 2,
                'rooms' => ['501', '502'],
                'floor' => 5,
            ],
            [
                'name' => 'Private Pool Family Villa',
                'slug' => 'private-pool-family-villa',
                'description' => 'Villa keluarga dua lantai dengan kolam renang pribadi, gazebo santai, taman privat, dan ruang keluarga luas yang sangat ramah anak.',
                'base_price_per_night' => 2750000,
                'weekend_price_per_night' => 2950000,
                'max_adults' => 4,
                'max_children' => 3,
                'room_size_sqm' => 110,
                'bed_type' => '2 King Beds + 1 Single Bed',
                'total_rooms' => 3,
                'rooms' => ['V-01', 'V-02', 'V-03'],
                'floor' => 1,
            ],
        ];

        foreach ($roomTypesData as $rtData) {
            $roomType = RoomType::updateOrCreate(
                ['slug' => $rtData['slug']],
                [
                    'hotel_id' => $hotel->id,
                    'name' => $rtData['name'],
                    'description' => $rtData['description'],
                    'base_price_per_night' => $rtData['base_price_per_night'],
                    'weekend_price_per_night' => $rtData['weekend_price_per_night'],
                    'max_adults' => $rtData['max_adults'],
                    'max_children' => $rtData['max_children'],
                    'room_size_sqm' => $rtData['room_size_sqm'],
                    'bed_type' => $rtData['bed_type'],
                    'total_rooms' => $rtData['total_rooms'],
                    'is_active' => true,
                ]
            );

            // Attach amenities
            $roomType->amenities()->sync($amenityIds);

            // Generate physical room units
            foreach ($rtData['rooms'] as $roomNum) {
                Room::updateOrCreate(
                    ['room_number' => $roomNum],
                    [
                        'room_type_id' => $roomType->id,
                        'floor' => $rtData['floor'],
                        'status' => 'available',
                    ]
                );
            }
        }

        // 5. Extra Add-on Services
        $extrasData = [
            [
                'name' => 'Sarapan Terapung Eksklusif (Floating Breakfast for 2)',
                'description' => 'Nikmati sarapan lezat di atas nampan terapung kayu di kolam renang kamar Anda lengkap dengan jus segar dan pastry.',
                'price' => 250000,
                'price_type' => 'per_booking',
                'icon' => 'Coffee',
                'is_active' => true,
            ],
            [
                'name' => 'Antar-Jemput Bandara VIP (Toyota Alphard)',
                'description' => 'Layanan penjemputan bandara ber-AC dingin dengan supir profesional dan air mineral dingin.',
                'price' => 350000,
                'price_type' => 'per_booking',
                'icon' => 'Car',
                'is_active' => true,
            ],
            [
                'name' => 'Pijat Tradisional Bali 60 Menit',
                'description' => 'Relaksasi tubuh mendalam oleh terapis bersertifikat menggunakan minyak aromaterapi lavender alami.',
                'price' => 200000,
                'price_type' => 'per_guest',
                'icon' => 'Sparkles',
                'is_active' => true,
            ],
            [
                'name' => 'Extra Bed & Linen Set Tambahan',
                'description' => 'Tempat tidur lipat pegas tebal lengkap dengan bantal bulu angsa dan selimut duvet lembut per malam.',
                'price' => 180000,
                'price_type' => 'per_night',
                'icon' => 'Bed',
                'is_active' => true,
            ],
            [
                'name' => 'Romantic Candlelight Beach Dinner',
                'description' => 'Makan malam romantis 4-course menu di pinggir pantai privat dengan hiasan lilin dan bunga.',
                'price' => 600000,
                'price_type' => 'per_booking',
                'icon' => 'Heart',
                'is_active' => true,
            ],
        ];

        foreach ($extrasData as $ex) {
            ExtraService::updateOrCreate(['name' => $ex['name']], $ex);
        }

        // 6. Sample Initial Bookings for Demo
        $sampleRoomType = RoomType::first();
        $sampleRoom = Room::where('room_type_id', $sampleRoomType->id)->first();

        // Sample 1: Confirmed Booking
        $checkIn1 = Carbon::today()->addDays(2);
        $checkOut1 = Carbon::today()->addDays(4);
        $b1 = Booking::updateOrCreate(
            ['booking_code' => 'HTL-20261102-CONF1'],
            [
                'user_id' => $customer->id,
                'room_type_id' => $sampleRoomType->id,
                'assigned_room_id' => $sampleRoom->id,
                'customer_name' => $customer->name,
                'customer_email' => $customer->email,
                'customer_phone' => $customer->phone,
                'check_in_date' => $checkIn1->toDateString(),
                'check_out_date' => $checkOut1->toDateString(),
                'total_nights' => 2,
                'total_adults' => 2,
                'total_children' => 0,
                'room_price_per_night' => $sampleRoomType->base_price_per_night,
                'total_room_amount' => $sampleRoomType->base_price_per_night * 2,
                'total_extras_amount' => 250000,
                'tax_and_service_amount' => (($sampleRoomType->base_price_per_night * 2) + 250000) * 0.1,
                'total_amount' => ((($sampleRoomType->base_price_per_night * 2) + 250000) * 1.1),
                'special_requests' => 'Mohon siapkan kamar non-smoking di lantai tinggi.',
                'status' => Booking::STATUS_CONFIRMED,
                'confirmed_at' => now(),
            ]
        );

        Payment::updateOrCreate(
            ['order_id' => 'ORDER-HTL-DEMO-001'],
            [
                'booking_id' => $b1->id,
                'gross_amount' => $b1->total_amount,
                'status' => Payment::STATUS_PAID,
                'payment_type' => 'qris',
                'paid_at' => now(),
            ]
        );
    }
}
