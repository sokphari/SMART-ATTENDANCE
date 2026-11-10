<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_guest_cannot_list_students(): void
    {
        $this->getJson('/api/v1/admin/students')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_students(): void
    {
        $student = Student::factory()->create();
        Sanctum::actingAs($student->user);

        $this->getJson('/api/v1/admin/students')->assertForbidden();
    }

    public function test_admin_can_list_students(): void
    {
        $this->actingAsAdmin();
        Student::factory()->create();

        $this->getJson('/api/v1/admin/students')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id',
                    'user_id',
                    'user' => ['id', 'name', 'email', 'role', 'status'],
                    'department_id',
                    'department' => ['id', 'name', 'code'],
                    'student_code',
                    'year_level',
                    'phone',
                ]],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_create_student_with_user_in_one_transaction(): void
    {
        $this->actingAsAdmin();
        $department = Department::factory()->create();

        $this->postJson('/api/v1/admin/students', [
            'name' => 'Sok Dara',
            'email' => 'dara@example.com',
            'password' => 'secret-password',
            'department_id' => $department->id,
            'student_code' => 'stu-1001',
            'year_level' => 2,
            'phone' => '012345678',
            'role' => UserRole::Admin->value,
        ])->assertCreated()
            ->assertJsonPath('data.student_code', 'STU-1001')
            ->assertJsonPath('data.year_level', 2)
            ->assertJsonPath('data.user.email', 'dara@example.com')
            ->assertJsonPath('data.user.role', UserRole::Student->value)
            ->assertJsonPath('data.department.id', $department->id);

        $this->assertDatabaseHas('users', [
            'email' => 'dara@example.com',
            'role' => UserRole::Student->value,
            'status' => AccountStatus::Active->value,
        ]);
        $this->assertDatabaseHas('students', [
            'student_code' => 'STU-1001',
            'department_id' => $department->id,
        ]);
    }

    public function test_create_student_validates_duplicate_email(): void
    {
        $this->actingAsAdmin();
        $department = Department::factory()->create();
        User::factory()->create(['email' => 'dara@example.com']);

        $this->postJson('/api/v1/admin/students', [
            'name' => 'Sok Dara',
            'email' => 'dara@example.com',
            'password' => 'secret-password',
            'department_id' => $department->id,
            'student_code' => 'STU-1001',
            'year_level' => 2,
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_create_student_validates_duplicate_code(): void
    {
        $this->actingAsAdmin();
        $department = Department::factory()->create();
        Student::factory()->create(['student_code' => 'STU-1001']);

        $this->postJson('/api/v1/admin/students', [
            'name' => 'Sok Dara',
            'email' => 'dara@example.com',
            'password' => 'secret-password',
            'department_id' => $department->id,
            'student_code' => 'STU-1001',
            'year_level' => 2,
        ])->assertStatus(422)->assertJsonValidationErrors('student_code');
    }

    public function test_create_student_validates_department_and_year_level(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/students', [
            'name' => 'Sok Dara',
            'email' => 'dara@example.com',
            'password' => 'secret-password',
            'department_id' => 99999,
            'student_code' => 'STU-1001',
            'year_level' => 11,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['department_id', 'year_level']);
    }

    public function test_admin_can_show_student(): void
    {
        $this->actingAsAdmin();
        $student = Student::factory()->create();

        $this->getJson("/api/v1/admin/students/{$student->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $student->id);
    }

    public function test_admin_can_update_student(): void
    {
        $this->actingAsAdmin();
        $student = Student::factory()->create(['year_level' => 1]);
        $department = Department::factory()->create();

        $this->patchJson("/api/v1/admin/students/{$student->id}", [
            'name' => 'Updated Student',
            'year_level' => 3,
            'department_id' => $department->id,
        ])->assertOk()
            ->assertJsonPath('data.year_level', 3)
            ->assertJsonPath('data.user.name', 'Updated Student')
            ->assertJsonPath('data.department.id', $department->id);
    }

    public function test_admin_can_deactivate_student(): void
    {
        $this->actingAsAdmin();
        $student = Student::factory()->create();

        $this->deleteJson("/api/v1/admin/students/{$student->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('users', [
            'id' => $student->user_id,
            'status' => AccountStatus::Inactive->value,
        ]);
        $this->assertDatabaseHas('students', ['id' => $student->id]);
    }

    public function test_admin_can_filter_students(): void
    {
        $this->actingAsAdmin();
        $department = Department::factory()->create();
        Student::factory()->create([
            'department_id' => $department->id,
            'year_level' => 2,
            'student_code' => 'STU-2001',
        ]);
        Student::factory()->create(['year_level' => 3, 'student_code' => 'STU-3001']);

        $this->getJson("/api/v1/admin/students?department_id={$department->id}&year_level=2&search=STU-2001")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.student_code', 'STU-2001');
    }
}
