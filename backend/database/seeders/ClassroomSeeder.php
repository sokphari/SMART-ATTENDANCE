<?php

namespace Database\Seeders;

use App\Enums\ClassroomStatus;
use App\Models\Classroom;
use Illuminate\Database\Seeder;

class ClassroomSeeder extends Seeder
{
    /**
     * Seed 10 classrooms with real Phnom Penh university area coordinates.
     */
    public function run(): void
    {
        $classrooms = [
            ['room_code' => 'B101', 'building' => 'Main Building', 'floor' => '1', 'latitude' => 11.5564000, 'longitude' => 104.9282000, 'allowed_radius_meters' => 50],
            ['room_code' => 'B102', 'building' => 'Main Building', 'floor' => '1', 'latitude' => 11.5565000, 'longitude' => 104.9283000, 'allowed_radius_meters' => 50],
            ['room_code' => 'B201', 'building' => 'Main Building', 'floor' => '2', 'latitude' => 11.5566000, 'longitude' => 104.9282000, 'allowed_radius_meters' => 60],
            ['room_code' => 'B202', 'building' => 'Main Building', 'floor' => '2', 'latitude' => 11.5567000, 'longitude' => 104.9281000, 'allowed_radius_meters' => 60],
            ['room_code' => 'C101', 'building' => 'Science Block', 'floor' => '1', 'latitude' => 11.5570000, 'longitude' => 104.9290000, 'allowed_radius_meters' => 55],
            ['room_code' => 'C102', 'building' => 'Science Block', 'floor' => '1', 'latitude' => 11.5571000, 'longitude' => 104.9291000, 'allowed_radius_meters' => 55],
            ['room_code' => 'C201', 'building' => 'Science Block', 'floor' => '2', 'latitude' => 11.5572000, 'longitude' => 104.9290000, 'allowed_radius_meters' => 65],
            ['room_code' => 'D101', 'building' => 'Engineering Block', 'floor' => '1', 'latitude' => 11.5558000, 'longitude' => 104.9275000, 'allowed_radius_meters' => 70],
            ['room_code' => 'D102', 'building' => 'Engineering Block', 'floor' => '1', 'latitude' => 11.5559000, 'longitude' => 104.9276000, 'allowed_radius_meters' => 70],
            ['room_code' => 'E101', 'building' => 'Language Centre', 'floor' => '1', 'latitude' => 11.5555000, 'longitude' => 104.9280000, 'allowed_radius_meters' => 45],
        ];

        foreach ($classrooms as $data) {
            Classroom::updateOrCreate(
                ['room_code' => $data['room_code']],
                [
                    'building' => $data['building'],
                    'floor' => $data['floor'],
                    'latitude' => $data['latitude'],
                    'longitude' => $data['longitude'],
                    'allowed_radius_meters' => $data['allowed_radius_meters'],
                    'status' => ClassroomStatus::Active,
                ],
            );
        }

        $this->command?->info('Seeded ' . count($classrooms) . ' classrooms.');
    }
}

