<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\ClassSectionStatus;
use App\Enums\EnrollmentStatus;
use App\Models\AcademicYear;
use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrollment;
use App\Models\Semester;
use App\Models\Student;
use App\Models\StudentRegistrationToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentRegistrationApiTest extends TestCase
{
    use RefreshDatabase;

    private function activeContext(int $capacity = 2): array
    {
        $department = Department::factory()->create();
        $year = AcademicYear::factory()->active()->create();
        $semester = Semester::factory()->create(['academic_year_id' => $year->id, 'status' => 'active']);
        $course = Course::factory()->create(['department_id' => $department->id]);
        $section = ClassSection::factory()->create([
            'course_id' => $course->id,
            'semester_id' => $semester->id,
            'capacity' => $capacity,
        ]);

        return compact('department', 'year', 'semester', 'course', 'section');
    }

    private function issueLink(): array
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);
        $response = $this->postJson('/api/v1/admin/student-registration-links', [], ['Origin' => 'http://localhost:3000'])
            ->assertCreated();
        $url = $response->json('data.url');
        preg_match('~/student-register/([a-f0-9]{64})$~', $url, $matches);

        $this->assertNotEmpty($matches[1] ?? null);
        $this->assertDatabaseHas('student_registration_tokens', [
            'id' => $response->json('data.id'),
            'token_hash' => hash('sha256', $matches[1]),
        ]);

        return [$admin, $matches[1], $response->json('data.id')];
    }

    private function registrationData(int $departmentId): array
    {
        return [
            'first_name' => 'Sok',
            'last_name' => 'Dara',
            'gender' => 'male',
            'department_id' => $departmentId,
            'year_level' => 2,
            'phone' => '012345678',
            'email' => 'sokdara@example.com',
            'password' => 'secure-password',
            'password_confirmation' => 'secure-password',
        ];
    }

    public function test_only_admin_can_generate_and_revoke_registration_links(): void
    {
        $this->postJson('/api/v1/admin/student-registration-links')->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/v1/admin/student-registration-links')->assertForbidden();

        [, , $id] = $this->issueLink();
        $this->postJson("/api/v1/admin/student-registration-links/{$id}/revoke")
            ->assertOk()->assertJsonPath('data.status', 'revoked');
        $this->assertNotNull(StudentRegistrationToken::query()->findOrFail($id)->revoked_at);
    }

    public function test_public_registration_creates_student_and_consumes_link_once(): void
    {
        $context = $this->activeContext();
        [, $token, $id] = $this->issueLink();

        $this->getJson("/api/v1/student-registrations/{$token}")
            ->assertOk()->assertJsonPath('data.status', 'active');
        $this->getJson("/api/v1/student-registrations/{$token}/departments")
            ->assertOk()->assertJsonPath('data.0.id', $context['department']->id);

        $this->postJson("/api/v1/student-registrations/{$token}", $this->registrationData($context['department']->id))
            ->assertCreated()
            ->assertJsonPath('data.student.user.email', 'sokdara@example.com')
            ->assertJsonPath('data.enrollment.class_section_id', $context['section']->id)
            ->assertJsonPath('data.section_created', false);

        $student = Student::query()->where('student_code', 'like', 'STU-%')->firstOrFail();
        $this->assertSame('male', $student->gender);
        $this->assertTrue(Hash::check('secure-password', $student->user->password));
        $this->assertDatabaseHas('enrollments', [
            'student_id' => $student->id,
            'class_section_id' => $context['section']->id,
            'status' => EnrollmentStatus::Enrolled->value,
        ]);
        $this->assertDatabaseHas('student_registration_tokens', ['id' => $id]);

        $this->postJson("/api/v1/student-registrations/{$token}", array_replace($this->registrationData($context['department']->id), ['email' => 'another@example.com']))
            ->assertStatus(409);
        $this->assertSame(1, Student::query()->count());
    }

    public function test_expired_and_revoked_links_cannot_be_used(): void
    {
        $context = $this->activeContext();
        [, $expiredToken, $expiredId] = $this->issueLink();
        StudentRegistrationToken::query()->whereKey($expiredId)->update(['expires_at' => now()->subMinute()]);
        $this->postJson("/api/v1/student-registrations/{$expiredToken}", $this->registrationData($context['department']->id))->assertStatus(410);

        [, $revokedToken, $revokedId] = $this->issueLink();
        StudentRegistrationToken::query()->whereKey($revokedId)->update(['revoked_at' => now()]);
        $this->postJson("/api/v1/student-registrations/{$revokedToken}", $this->registrationData($context['department']->id))->assertStatus(410);
        $this->assertSame(0, Student::query()->count());
        $this->assertDatabaseMissing('users', ['email' => 'sokdara@example.com']);
    }

    public function test_full_class_creates_pending_setup_section_and_registers_without_exceeding_capacity(): void
    {
        $context = $this->activeContext(capacity: 1);
        $existing = Student::factory()->create(['department_id' => $context['department']->id]);
        Enrollment::factory()->create([
            'student_id' => $existing->id,
            'class_section_id' => $context['section']->id,
            'status' => EnrollmentStatus::Enrolled->value,
        ]);
        [, $token] = $this->issueLink();

        $this->postJson("/api/v1/student-registrations/{$token}", $this->registrationData($context['department']->id))
            ->assertCreated()->assertJsonPath('data.section_created', true)
            ->assertJsonPath('data.enrollment.needs_setup', true);

        $this->assertSame(1, Enrollment::query()->where('class_section_id', $context['section']->id)->where('status', EnrollmentStatus::Enrolled->value)->count());
        $pending = ClassSection::query()->where('status', ClassSectionStatus::PendingSetup->value)->firstOrFail();
        $this->assertSame($context['course']->id, $pending->course_id);
        $this->assertSame(1, $pending->enrollments()->where('status', EnrollmentStatus::Enrolled->value)->count());
    }

    public function test_registration_validation_and_missing_academic_context_roll_back_account_creation(): void
    {
        $department = Department::factory()->create();
        [, $token] = $this->issueLink();
        $this->postJson("/api/v1/student-registrations/{$token}", array_replace($this->registrationData($department->id), ['email' => 'bad']))
            ->assertUnprocessable();

        $this->postJson("/api/v1/student-registrations/{$token}", $this->registrationData($department->id))
            ->assertUnprocessable()->assertJsonValidationErrors('academic_period');
        $this->assertSame(0, Student::query()->count());
        $this->assertDatabaseMissing('users', ['email' => 'sokdara@example.com']);
        $this->assertDatabaseHas('student_registration_tokens', ['token_hash' => hash('sha256', $token), 'used_at' => null]);
    }
}
