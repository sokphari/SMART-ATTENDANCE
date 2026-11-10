<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\DepartmentStatus;
use App\Enums\UserRole;
use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DepartmentApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_guest_cannot_list_departments(): void
    {
        $this->getJson('/api/v1/admin/departments')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_departments(): void
    {
        $student = User::factory()->create([
            'role' => UserRole::Student->value,
        ]);

        Sanctum::actingAs($student);

        $this->getJson('/api/v1/admin/departments')->assertForbidden();
    }

    public function test_admin_can_list_departments(): void
    {
        $this->actingAsAdmin();
        Department::factory()->count(3)->create();

        $this->getJson('/api/v1/admin/departments')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'name', 'code', 'description', 'status']],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_create_department(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/departments', [
            'name' => 'Computer Science',
            'code' => 'cs',
            'description' => 'Computing department',
            'status' => DepartmentStatus::Active->value,
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Computer Science')
            ->assertJsonPath('data.code', 'CS')
            ->assertJsonPath('data.status', DepartmentStatus::Active->value);

        $this->assertDatabaseHas('departments', [
            'code' => 'CS',
            'status' => DepartmentStatus::Active->value,
        ]);
    }

    public function test_create_department_validates_duplicate_code(): void
    {
        $this->actingAsAdmin();
        Department::factory()->create(['code' => 'CS']);

        $this->postJson('/api/v1/admin/departments', [
            'name' => 'Another Department',
            'code' => 'CS',
        ])->assertStatus(422)->assertJsonValidationErrors('code');
    }

    public function test_admin_can_show_department(): void
    {
        $this->actingAsAdmin();
        $department = Department::factory()->create();

        $this->getJson("/api/v1/admin/departments/{$department->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $department->id);
    }

    public function test_admin_can_update_department(): void
    {
        $this->actingAsAdmin();
        $department = Department::factory()->create(['code' => 'OLD']);

        $this->patchJson("/api/v1/admin/departments/{$department->id}", [
            'name' => 'Renamed Department',
            'code' => 'new',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Renamed Department')
            ->assertJsonPath('data.code', 'NEW');
    }

    public function test_admin_can_deactivate_department(): void
    {
        $this->actingAsAdmin();
        $department = Department::factory()->create();

        $this->deleteJson("/api/v1/admin/departments/{$department->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('departments', [
            'id' => $department->id,
            'status' => DepartmentStatus::Inactive->value,
        ]);
    }

    public function test_admin_can_filter_and_search_departments(): void
    {
        $this->actingAsAdmin();
        Department::factory()->create(['name' => 'Computer Science', 'code' => 'CS']);
        Department::factory()->inactive()->create(['name' => 'History', 'code' => 'HIS']);

        $this->getJson('/api/v1/admin/departments?search=comput&status=active')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'CS');
    }
}
