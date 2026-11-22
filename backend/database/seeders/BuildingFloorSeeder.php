<?php

namespace Database\Seeders;

use App\Enums\ClassroomStatus;
use App\Models\Building;
use App\Models\Floor;
use Illuminate\Database\Seeder;

class BuildingFloorSeeder extends Seeder
{
    /** Ensure the demo campus has five buildings and linked floor records. */
    public function run(): void
    {
        $buildings = [
            ['code' => 'MAIN', 'name' => 'Main Building', 'floors' => [1, 2]],
            ['code' => 'SCIENCE', 'name' => 'Science Block', 'floors' => [1, 2]],
            ['code' => 'ENGINEERING', 'name' => 'Engineering Block', 'floors' => [1]],
            ['code' => 'LANGUAGE', 'name' => 'Language Centre', 'floors' => [1]],
            ['code' => 'LIBRARY', 'name' => 'Library Annex', 'floors' => [1]],
        ];

        foreach ($buildings as $data) {
            $building = Building::updateOrCreate(
                ['name' => $data['name']],
                ['code' => $data['code'], 'status' => ClassroomStatus::Active->value],
            );

            foreach ($data['floors'] as $number) {
                Floor::updateOrCreate(
                    ['building_id' => $building->id, 'name' => (string) $number],
                    ['floor_number' => $number, 'status' => ClassroomStatus::Active->value],
                );
            }
        }

        $this->command?->info('Ensured five campus buildings and their floors.');
    }
}
