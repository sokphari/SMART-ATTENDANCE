<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\Building;
use App\Models\Classroom;
use App\Models\Floor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BuildingListApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_buildings_list_includes_real_floor_room_and_seat_totals(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $building = Building::create([
            'code' => 'A',
            'name' => 'Main Building',
            'status' => 'active',
        ]);
        $firstFloor = Floor::create([
            'building_id' => $building->id,
            'name' => 'Ground',
            'floor_number' => 0,
            'status' => 'active',
        ]);
        $secondFloor = Floor::create([
            'building_id' => $building->id,
            'name' => 'First Floor',
            'floor_number' => 1,
            'status' => 'active',
        ]);

        Classroom::factory()->create([
            'room_code' => 'A101',
            'floor_id' => $firstFloor->id,
            'capacity' => 35,
        ]);
        Classroom::factory()->create([
            'room_code' => 'A102',
            'floor_id' => $secondFloor->id,
            'capacity' => 40,
        ]);

        $this->getJson('/api/v1/admin/buildings')
            ->assertOk()
            ->assertJsonPath('data.0.code', 'A')
            ->assertJsonPath('data.0.floors_count', 2)
            ->assertJsonPath('data.0.classrooms_count', 2)
            ->assertJsonPath('data.0.total_seats', 75);

        $this->getJson("/api/v1/admin/buildings/{$building->id}")
            ->assertOk()
            ->assertJsonPath('data.classrooms_count', 2)
            ->assertJsonPath('data.total_seats', 75);
    }
}
