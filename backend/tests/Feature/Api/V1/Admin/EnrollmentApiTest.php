<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\AccountStatus;
use App\Enums\EnrollmentStatus;
use App\Models\ClassSection;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EnrollmentApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_guest_cannot_list_enrollments(): void
    {
        $this->getJson('/api/v1/admin/enrollments')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_enrollments(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/enrollments')->assertForbidden();
    }

    public function test_admin_can_list_enrollments(): void
    {
        $this->actingAsAdmin();
        Enrollment::factory()->create();

        $this->getJson('/api/v1/admin/enrollments')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id',
                    'class_section_id',
                    'class_section' => ['id', 'section_code'],
                    'student_id',
                    'student' => ['id', 'student_code', 'user' => ['id', 'name', 'email']],
                    'enrollment_date',
                    'status',
                ]],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_enroll_student(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->create(['capacity' => 10]);
        $student = Student::factory()->create();

        $this->postJson('/api/v1/admin/enrollments', [
            'class_section_id' => $classSection->id,
            'student_id' => $student->id,
            'enrollment_date' => '2026-01-15',
        ])->assertCreated()
            ->assertJsonPath('data.class_section_id', $classSection->id)
            ->assertJsonPath('data.student_id', $student->id)
            ->assertJsonPath('data.enrollment_date', '2026-01-15')
            ->assertJsonPath('data.status', EnrollmentStatus::Enrolled->value);

        $this->assertDatabaseHas('enrollments', [
            'class_section_id' => $classSection->id,
            'student_id' => $student->id,
            'status' => EnrollmentStatus::Enrolled->value,
        ]);
    }

    public function test_cannot_duplicate_enrollment(): void
    {
        $this->actingAsAdmin();
        $enrollment = Enrollment::factory()->create();

        $this->postJson('/api/v1/admin/enrollments', [
            'class_section_id' => $enrollment->class_section_id,
            'student_id' => $enrollment->student_id,
        ])->assertStatus(422)->assertJsonValidationErrors('student_id');
    }

    public function test_cannot_enroll_inactive_student(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->create();
        $student = Student::factory()->create();
        $student->user->update(['status' => AccountStatus::Inactive->value]);

        $this->postJson('/api/v1/admin/enrollments', [
            'class_section_id' => $classSection->id,
            'student_id' => $student->id,
        ])->assertStatus(422)->assertJsonValidationErrors('student_id');
    }

    public function test_enrollment_respects_section_capacity(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->create(['capacity' => 1]);
        Enrollment::factory()->create(['class_section_id' => $classSection->id]);
        $student = Student::factory()->create();

        $this->postJson('/api/v1/admin/enrollments', [
            'class_section_id' => $classSection->id,
            'student_id' => $student->id,
        ])->assertStatus(422)->assertJsonValidationErrors('class_section_id');
    }

    public function test_create_enrollment_validates_relations(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/enrollments', [
            'class_section_id' => 99999,
            'student_id' => 99999,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['class_section_id', 'student_id']);
    }

    public function test_admin_can_show_enrollment(): void
    {
        $this->actingAsAdmin();
        $enrollment = Enrollment::factory()->create();

        $this->getJson("/api/v1/admin/enrollments/{$enrollment->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $enrollment->id);
    }

    public function test_admin_can_change_enrollment_status(): void
    {
        $this->actingAsAdmin();
        $enrollment = Enrollment::factory()->create();

        $this->patchJson("/api/v1/admin/enrollments/{$enrollment->id}", [
            'status' => EnrollmentStatus::Completed->value,
        ])->assertOk()
            ->assertJsonPath('data.status', EnrollmentStatus::Completed->value);
    }

    public function test_admin_can_withdraw_enrollment(): void
    {
        $this->actingAsAdmin();
        $enrollment = Enrollment::factory()->create();

        $this->deleteJson("/api/v1/admin/enrollments/{$enrollment->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('enrollments', [
            'id' => $enrollment->id,
            'status' => EnrollmentStatus::Dropped->value,
        ]);
    }

    public function test_admin_can_filter_enrollments(): void
    {
        $this->actingAsAdmin();
        $enrollment = Enrollment::factory()->create();
        Enrollment::factory()->create();

        $this->getJson("/api/v1/admin/enrollments?class_section_id={$enrollment->class_section_id}&student_id={$enrollment->student_id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $enrollment->id);
    }
}
