<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TeacherApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_guest_cannot_list_teachers(): void
    {
        $this->getJson('/api/v1/admin/teachers')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_teachers(): void
    {
        $teacher = Teacher::factory()->create();
        Sanctum::actingAs($teacher->user);

        $this->getJson('/api/v1/admin/teachers')->assertForbidden();
    }

    public function test_admin_can_list_teachers(): void
    {
        $this->actingAsAdmin();
        Teacher::factory()->create();

        $this->getJson('/api/v1/admin/teachers')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id',
                    'user_id',
                    'user' => ['id', 'name', 'email', 'role', 'status'],
                    'department_id',
                    'department' => ['id', 'name', 'code'],
                    'teacher_code',
                    'phone',
                ]],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_create_teacher_with_user_in_one_transaction(): void
    {
        $this->actingAsAdmin();
        $department = Department::factory()->create();

        $this->postJson('/api/v1/admin/teachers', [
            'name' => 'Chan Vibol',
            'email' => 'vibol@example.com',
            'password' => 'secret-password',
            'department_id' => $department->id,
            'teacher_code' => 'tch-2001',
            'phone' => '098765432',
            'role' => UserRole::Admin->value,
        ])->assertCreated()
            ->assertJsonPath('data.teacher_code', 'TCH-2001')
            ->assertJsonPath('data.user.email', 'vibol@example.com')
            ->assertJsonPath('data.user.role', UserRole::Teacher->value)
            ->assertJsonPath('data.department.id', $department->id);

        $this->assertDatabaseHas('users', [
            'email' => 'vibol@example.com',
            'role' => UserRole::Teacher->value,
            'status' => AccountStatus::Active->value,
        ]);
        $this->assertDatabaseHas('teachers', [
            'teacher_code' => 'TCH-2001',
            'department_id' => $department->id,
        ]);
    }

    public function test_create_teacher_validates_duplicate_email_and_code(): void
    {
        $this->actingAsAdmin();
        $department = Department::factory()->create();
        User::factory()->create(['email' => 'vibol@example.com']);
        Teacher::factory()->create(['teacher_code' => 'TCH-2001']);

        $this->postJson('/api/v1/admin/teachers', [
            'name' => 'Chan Vibol',
            'email' => 'vibol@example.com',
            'password' => 'secret-password',
            'department_id' => $department->id,
            'teacher_code' => 'TCH-2001',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'teacher_code']);
    }

    public function test_create_teacher_validates_department(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/teachers', [
            'name' => 'Chan Vibol',
            'email' => 'vibol@example.com',
            'password' => 'secret-password',
            'department_id' => 99999,
            'teacher_code' => 'TCH-2001',
        ])->assertStatus(422)->assertJsonValidationErrors('department_id');
    }

    public function test_admin_can_show_teacher(): void
    {
        $this->actingAsAdmin();
        $teacher = Teacher::factory()->create();

        $this->getJson("/api/v1/admin/teachers/{$teacher->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $teacher->id);
    }

    public function test_admin_can_update_teacher(): void
    {
        $this->actingAsAdmin();
        $teacher = Teacher::factory()->create();
        $department = Department::factory()->create();

        $this->patchJson("/api/v1/admin/teachers/{$teacher->id}", [
            'name' => 'Updated Teacher',
            'department_id' => $department->id,
        ])->assertOk()
            ->assertJsonPath('data.user.name', 'Updated Teacher')
            ->assertJsonPath('data.department.id', $department->id);
    }

    public function test_admin_can_deactivate_teacher(): void
    {
        $this->actingAsAdmin();
        $teacher = Teacher::factory()->create();

        $this->deleteJson("/api/v1/admin/teachers/{$teacher->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('users', [
            'id' => $teacher->user_id,
            'status' => AccountStatus::Inactive->value,
        ]);
        $this->assertDatabaseHas('teachers', ['id' => $teacher->id]);
    }

    public function test_admin_can_filter_teachers(): void
    {
        $this->actingAsAdmin();
        $department = Department::factory()->create();
        Teacher::factory()->create([
            'department_id' => $department->id,
            'teacher_code' => 'TCH-2001',
        ]);
        Teacher::factory()->create(['teacher_code' => 'TCH-3001']);

        $this->getJson("/api/v1/admin/teachers?department_id={$department->id}&search=TCH-2001")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.teacher_code', 'TCH-2001');
    }
}
