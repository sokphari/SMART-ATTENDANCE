<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\ClassroomStatus;
use App\Models\Classroom;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClassroomApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_guest_cannot_list_classrooms(): void
    {
        $this->getJson('/api/v1/admin/classrooms')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_classrooms(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/classrooms')->assertForbidden();
    }

    public function test_admin_can_list_classrooms(): void
    {
        $this->actingAsAdmin();
        Classroom::factory()->create();

        $this->getJson('/api/v1/admin/classrooms')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id',
                    'room_code',
                    'building',
                    'floor',
                    'latitude',
                    'longitude',
                    'allowed_radius_meters',
                    'status',
                ]],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_create_classroom_with_gps_and_radius(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/classrooms', [
            'room_code' => 'rm-101',
            'building' => 'Building A',
            'floor' => '1',
            'latitude' => 11.5564,
            'longitude' => 104.9282,
            'allowed_radius_meters' => 50,
        ])->assertCreated()
            ->assertJsonPath('data.room_code', 'RM-101')
            ->assertJsonPath('data.latitude', 11.5564)
            ->assertJsonPath('data.longitude', 104.9282)
            ->assertJsonPath('data.allowed_radius_meters', 50)
            ->assertJsonPath('data.status', ClassroomStatus::Active->value);

        $this->assertDatabaseHas('classrooms', [
            'room_code' => 'RM-101',
            'allowed_radius_meters' => 50,
        ]);
    }

    public function test_create_classroom_defaults_radius_when_omitted(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/classrooms', [
            'room_code' => 'RM-102',
            'latitude' => 11.5564,
            'longitude' => 104.9282,
        ])->assertCreated()
            ->assertJsonPath('data.allowed_radius_meters', 100);
    }

    public function test_create_classroom_validates_duplicate_code(): void
    {
        $this->actingAsAdmin();
        Classroom::factory()->create(['room_code' => 'RM-101']);

        $this->postJson('/api/v1/admin/classrooms', [
            'room_code' => 'RM-101',
            'latitude' => 11.5564,
            'longitude' => 104.9282,
        ])->assertStatus(422)->assertJsonValidationErrors('room_code');
    }

    public function test_create_classroom_validates_gps_and_radius(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/classrooms', [
            'room_code' => 'RM-101',
            'latitude' => 91,
            'longitude' => 181,
            'allowed_radius_meters' => 5,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['latitude', 'longitude', 'allowed_radius_meters']);
    }

    public function test_admin_can_show_classroom(): void
    {
        $this->actingAsAdmin();
        $classroom = Classroom::factory()->create();

        $this->getJson("/api/v1/admin/classrooms/{$classroom->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $classroom->id);
    }

    public function test_admin_can_update_classroom(): void
    {
        $this->actingAsAdmin();
        $classroom = Classroom::factory()->create();

        $this->patchJson("/api/v1/admin/classrooms/{$classroom->id}", [
            'building' => 'Building B',
            'floor' => '3',
            'latitude' => 11.6,
            'longitude' => 104.9,
            'allowed_radius_meters' => 200,
        ])->assertOk()
            ->assertJsonPath('data.building', 'Building B')
            ->assertJsonPath('data.floor', '3')
            ->assertJsonPath('data.latitude', 11.6)
            ->assertJsonPath('data.longitude', 104.9)
            ->assertJsonPath('data.allowed_radius_meters', 200);
    }

    public function test_admin_can_deactivate_classroom(): void
    {
        $this->actingAsAdmin();
        $classroom = Classroom::factory()->create();

        $this->deleteJson("/api/v1/admin/classrooms/{$classroom->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('classrooms', [
            'id' => $classroom->id,
            'status' => ClassroomStatus::Inactive->value,
        ]);
    }

    public function test_admin_can_search_and_filter_classrooms(): void
    {
        $this->actingAsAdmin();
        Classroom::factory()->create([
            'room_code' => 'RM-101',
            'building' => 'Building A',
            'status' => ClassroomStatus::Active,
        ]);
        Classroom::factory()->create(['room_code' => 'RM-202']);

        $this->getJson('/api/v1/admin/classrooms?status=active&search=RM-101')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.room_code', 'RM-101');
    }
}
