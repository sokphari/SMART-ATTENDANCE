<?php

namespace Tests\Feature\Api\V1\Student;

use App\Enums\AttendanceSessionStatus;
use App\Enums\AttendanceStatus;
use App\Enums\VerificationMethod;
use App\Models\AttendanceQrToken;
use App\Models\AttendanceSession;
use App\Models\ClassSection;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentAttendanceCheckInApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  array<string, mixed>  $sessionOverrides
     * @return array{0: Student, 1: AttendanceSession, 2: string}
     */
    private function attendanceScenario(array $sessionOverrides = []): array
    {
        $teacher = Teacher::factory()->create();
        $classSection = ClassSection::factory()->create();
        $enrollment = Enrollment::factory()->create([
            'class_section_id' => $classSection->id,
        ]);

        $session = AttendanceSession::factory()->create(array_merge([
            'teacher_id' => $teacher->id,
            'class_section_id' => $classSection->id,
            'starts_at' => now()->subMinutes(10),
            'late_after' => now()->addMinutes(10),
            'closes_at' => now()->addHour(),
        ], $sessionOverrides));

        $plainToken = 'plain-token-'.Str::random(16);

        AttendanceQrToken::factory()->create([
            'attendance_session_id' => $session->id,
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => now()->addSeconds(30),
            'revoked_at' => null,
        ]);

        return [$enrollment->student, $session, $plainToken];
    }

    /**
     * @return array<string, mixed>
     */
    private function checkInPayload(string $token, array $overrides = []): array
    {
        return array_merge([
            'token' => $token,
            'latitude' => 11.5564,
            'longitude' => 104.9282,
            'gps_accuracy_meters' => 10,
        ], $overrides);
    }

    public function test_guest_cannot_check_in(): void
    {
        $this->postJson('/api/v1/student/attendance/check-in')->assertUnauthorized();
    }

    public function test_teacher_cannot_use_student_check_in(): void
    {
        Sanctum::actingAs(Teacher::factory()->create()->user);

        $this->postJson('/api/v1/student/attendance/check-in')
            ->assertForbidden();
    }

    public function test_student_can_check_in_as_present(): void
    {
        [$student, $session, $token] = $this->attendanceScenario();
        Sanctum::actingAs($student->user);

        $this->postJson('/api/v1/student/attendance/check-in', $this->checkInPayload($token))
            ->assertCreated()
            ->assertJsonPath('data.attendance_session_id', $session->id)
            ->assertJsonPath('data.student_id', $student->id)
            ->assertJsonPath('data.status', AttendanceStatus::Present->value)
            ->assertJsonPath('data.verification_method', VerificationMethod::DynamicQr->value);

        $this->assertDatabaseHas('attendances', [
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => AttendanceStatus::Present->value,
            'verification_method' => VerificationMethod::DynamicQr->value,
        ]);
    }

    public function test_student_checking_in_after_late_threshold_is_late(): void
    {
        [$student, , $token] = $this->attendanceScenario([
            'late_after' => now()->subMinute(),
        ]);
        Sanctum::actingAs($student->user);

        $this->postJson('/api/v1/student/attendance/check-in', $this->checkInPayload($token))
            ->assertCreated()
            ->assertJsonPath('data.status', AttendanceStatus::Late->value);
    }

    public function test_student_cannot_check_in_with_invalid_token(): void
    {
        [$student] = $this->attendanceScenario();
        Sanctum::actingAs($student->user);

        $this->postJson('/api/v1/student/attendance/check-in', $this->checkInPayload('not-a-real-token'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('token');
    }

    public function test_student_cannot_check_in_with_expired_token(): void
    {
        [$student, , $token] = $this->attendanceScenario();
        Sanctum::actingAs($student->user);

        AttendanceQrToken::query()
            ->where('token_hash', hash('sha256', $token))
            ->update(['expires_at' => now()->subSecond()]);

        $this->postJson('/api/v1/student/attendance/check-in', $this->checkInPayload($token))
            ->assertStatus(422)
            ->assertJsonValidationErrors('token');
    }

    public function test_student_cannot_check_in_with_revoked_token(): void
    {
        [$student, , $token] = $this->attendanceScenario();
        Sanctum::actingAs($student->user);

        AttendanceQrToken::query()
            ->where('token_hash', hash('sha256', $token))
            ->update(['revoked_at' => now()]);

        $this->postJson('/api/v1/student/attendance/check-in', $this->checkInPayload($token))
            ->assertStatus(422)
            ->assertJsonValidationErrors('token');
    }

    public function test_student_cannot_check_in_to_closed_session(): void
    {
        [$student, , $token] = $this->attendanceScenario([
            'status' => AttendanceSessionStatus::Closed,
            'closed_at' => now(),
        ]);
        Sanctum::actingAs($student->user);

        $this->postJson('/api/v1/student/attendance/check-in', $this->checkInPayload($token))
            ->assertStatus(422)
            ->assertJsonValidationErrors('token');
    }

    public function test_student_cannot_check_in_to_session_outside_active_window(): void
    {
        [$student, , $token] = $this->attendanceScenario([
            'starts_at' => now()->addHour(),
            'late_after' => now()->addHours(2),
            'closes_at' => now()->addHours(3),
        ]);
        Sanctum::actingAs($student->user);

        $this->postJson('/api/v1/student/attendance/check-in', $this->checkInPayload($token))
            ->assertStatus(422)
            ->assertJsonValidationErrors('token');
    }

    public function test_unenrolled_student_cannot_check_in(): void
    {
        [, , $token] = $this->attendanceScenario();
        $outsider = Student::factory()->create();
        Sanctum::actingAs($outsider->user);

        $this->postJson('/api/v1/student/attendance/check-in', $this->checkInPayload($token))
            ->assertForbidden();
    }

    public function test_student_outside_radius_cannot_check_in(): void
    {
        [$student, , $token] = $this->attendanceScenario();
        Sanctum::actingAs($student->user);

        $this->postJson('/api/v1/student/attendance/check-in', $this->checkInPayload($token, [
            'latitude' => 11.6000,
            'longitude' => 104.9282,
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('latitude');
    }

    public function test_student_with_poor_gps_accuracy_cannot_check_in(): void
    {
        [$student, , $token] = $this->attendanceScenario();
        Sanctum::actingAs($student->user);

        $this->postJson('/api/v1/student/attendance/check-in', $this->checkInPayload($token, [
            'gps_accuracy_meters' => 50,
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('gps_accuracy_meters');
    }

    public function test_student_cannot_check_in_twice(): void
    {
        [$student, , $token] = $this->attendanceScenario();
        Sanctum::actingAs($student->user);

        $this->postJson('/api/v1/student/attendance/check-in', $this->checkInPayload($token))
            ->assertCreated();

        $this->postJson('/api/v1/student/attendance/check-in', $this->checkInPayload($token))
            ->assertStatus(409);
    }
}
