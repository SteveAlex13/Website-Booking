<?php

namespace Database\Seeders;

use App\Models\RoomType;
use Illuminate\Database\Seeder;

class RoomTypeImageSeeder extends Seeder
{
    /**
     * Run the database seeds to update room type images.
     */
    public function run(): void
    {
        $curatedImages = [
            'deluxe-ocean-view-king-room' => 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
            'executive-twin-garden-suite' => 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
            'royal-honeymoon-suite-with-jacuzzi' => 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
            'presidential-ocean-penthouse-suite' => 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
            'private-pool-family-villa' => 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
        ];

        $fallbackImages = [
            'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80',
        ];

        $fallbackIndex = 0;
        $roomTypes = RoomType::all();

        foreach ($roomTypes as $roomType) {
            if (isset($curatedImages[$roomType->slug])) {
                $roomType->update([
                    'featured_image' => $curatedImages[$roomType->slug]
                ]);
            } else {
                $image = $fallbackImages[$fallbackIndex % count($fallbackImages)];
                $fallbackIndex++;
                $roomType->update([
                    'featured_image' => $image
                ]);
            }
        }
    }
}

