<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BuildingSetupApiTest extends TestCase
{
    use RefreshDatabase;

    private function payload(): array
    {
        return [
            'building' => [
                'code' => 'a1',
                'name' => 'Building A',
                'description' => 'Main campus',
            ],
            'floors' => [
                [
                    'name' => 'Ground Floor',
                    'floor_number' => 0,
                    'rooms' => [
                        ['room_code' => 'a-101', 'capacity' => 35, 'room_type' => 'classroom'],
                        [
                            'room_code' => 'a-102',
                            'capacity' => 40,
                            'room_type' => 'laboratory',
                            'latitude' => 11.5564,
                            'longitude' => 104.9282,
                        ],
                    ],
                ],
                [
                    'name' => 'First Floor',
                    'floor_number' => 1,
                    'rooms' => [
                        ['room_code' => 'a-201', 'capacity' => 45, 'room_type' => 'lecture_hall'],
                    ],
                ],
            ],
        ];
    }

    private function actAsAdmin(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());
    }

    public function test_only_admin_can_create_a_complete_building(): void
    {
        $this->postJson('/api/v1/admin/buildings/setup', $this->payload())
            ->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/v1/admin/buildings/setup', $this->payload())
            ->assertForbidden();

        $this->assertDatabaseCount('buildings', 0);
        $this->assertDatabaseCount('floors', 0);
        $this->assertDatabaseCount('classrooms', 0);
    }

    public function test_admin_creates_building_floors_and_classrooms_together(): void
    {
        $this->actAsAdmin();

        $this->postJson('/api/v1/admin/buildings/setup', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.code', 'A1')
            ->assertJsonPath('data.floors_count', 2)
            ->assertJsonPath('data.classrooms_count', 3)
            ->assertJsonPath('data.total_seats', 120);

        $this->assertDatabaseHas('buildings', ['code' => 'A1', 'name' => 'Building A']);
        $this->assertDatabaseHas('floors', ['name' => 'Ground Floor', 'floor_number' => 0]);
        $this->assertDatabaseHas('classrooms', [
            'room_code' => 'A-101', 'capacity' => 35, 'latitude' => null, 'longitude' => null,
        ]);
        $this->assertDatabaseHas('classrooms', [
            'room_code' => 'A-102', 'capacity' => 40, 'latitude' => 11.5564, 'longitude' => 104.9282,
        ]);
    }

    public function test_invalid_nested_rooms_create_nothing(): void
    {
        $this->actAsAdmin();
        $payload = $this->payload();
        $payload['floors'][1]['rooms'][0]['room_code'] = 'A-101';

        $this->postJson('/api/v1/admin/buildings/setup', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('floors.1.rooms.0.room_code');

        $this->assertDatabaseCount('buildings', 0);
        $this->assertDatabaseCount('floors', 0);
        $this->assertDatabaseCount('classrooms', 0);
    }

    public function test_setup_rejects_incomplete_gps_coordinates(): void
    {
        $this->actAsAdmin();
        $payload = $this->payload();
        $payload['floors'][0]['rooms'][0]['latitude'] = 11.5564;

        $this->postJson('/api/v1/admin/buildings/setup', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('floors.0.rooms.0.latitude');

        $this->assertDatabaseCount('buildings', 0);
    }

    public function test_setup_rejects_duplicate_floors(): void
    {
        $this->actAsAdmin();
        $payload = $this->payload();
        $payload['floors'][1]['floor_number'] = 0;

        $this->postJson('/api/v1/admin/buildings/setup', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('floors.1.floor_number');

        $this->assertDatabaseCount('buildings', 0);
    }

    public function test_individual_classroom_can_be_created_without_gps(): void
    {
        $this->actAsAdmin();

        $this->postJson('/api/v1/admin/classrooms', [
            'room_code' => 'ROOM-NOGPS',
            'capacity' => 35,
        ])->assertCreated()
            ->assertJsonPath('data.latitude', null)
            ->assertJsonPath('data.longitude', null);
    }
}
