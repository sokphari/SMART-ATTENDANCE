<?php

namespace Tests\Feature\Api\V1\Teacher;

use App\Enums\AttendanceSessionStatus;
use App\Enums\AttendanceStatus;
use App\Enums\VerificationMethod;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\ClassSchedule;
use App\Models\ClassSection;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TeacherAttendanceSessionApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{0: Teacher, 1: ClassSection, 2: Classroom}
     */
    private function assignedTeacher(): array
    {
        $teacher = Teacher::factory()->create();
        $classSection = ClassSection::factory()->create();

        TeacherAssignment::factory()->create([
            'class_section_id' => $classSection->id,
            'teacher_id' => $teacher->id,
        ]);

        $classroom = Classroom::factory()->create([
            'latitude' => 11.5564,
            'longitude' => 104.9282,
            'allowed_radius_meters' => 100,
        ]);

        Sanctum::actingAs($teacher->user);

        return [$teacher, $classSection, $classroom];
    }

    /**
     * @return array<string, mixed>
     */
    private function sessionPayload(ClassSection $classSection, Classroom $classroom): array
    {
        return [
            'class_section_id' => $classSection->id,
            'classroom_id' => $classroom->id,
            'session_date' => now()->toDateString(),
            'starts_at' => now()->subMinutes(5)->toIso8601String(),
            'late_after' => now()->addMinutes(10)->toIso8601String(),
            'closes_at' => now()->addHour()->toIso8601String(),
        ];
    }

    public function test_guest_cannot_open_attendance_session(): void
    {
        $this->postJson('/api/v1/teacher/attendance-sessions')->assertUnauthorized();
    }

    public function test_admin_cannot_open_teacher_attendance_session(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson('/api/v1/teacher/attendance-sessions')->assertForbidden();
    }

    public function test_teacher_can_list_own_sessions_only(): void
    {
        $teacher = Teacher::factory()->create();
        AttendanceSession::factory()->create(['teacher_id' => $teacher->id]);
        AttendanceSession::factory()->create();
        Sanctum::actingAs($teacher->user);

        $this->getJson('/api/v1/teacher/attendance-sessions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.teacher_id', $teacher->id);
    }

    public function test_assigned_teacher_can_open_attendance_session(): void
    {
        [$teacher, $classSection, $classroom] = $this->assignedTeacher();

        $this->postJson('/api/v1/teacher/attendance-sessions', $this->sessionPayload($classSection, $classroom))
            ->assertCreated()
            ->assertJsonPath('data.class_section_id', $classSection->id)
            ->assertJsonPath('data.teacher_id', $teacher->id)
            ->assertJsonPath('data.classroom_id', $classroom->id)
            ->assertJsonPath('data.status', AttendanceSessionStatus::Open->value)
            ->assertJsonPath('data.allowed_latitude', 11.5564)
            ->assertJsonPath('data.allowed_longitude', 104.9282)
            ->assertJsonPath('data.allowed_radius_meters', 100);

        $this->assertDatabaseHas('attendance_sessions', [
            'class_section_id' => $classSection->id,
            'teacher_id' => $teacher->id,
            'classroom_id' => $classroom->id,
            'status' => AttendanceSessionStatus::Open->value,
        ]);
    }

    public function test_teacher_session_preserves_cambodia_local_times_when_stored_in_utc(): void
    {
        [, $classSection, $classroom] = $this->assignedTeacher();

        $response = $this->postJson('/api/v1/teacher/attendance-sessions', [
            'class_section_id' => $classSection->id,
            'classroom_id' => $classroom->id,
            'session_date' => '2026-11-20',
            'starts_at' => '2026-11-20T14:00:00+07:00',
            'late_after' => '2026-11-20T14:15:00+07:00',
            'closes_at' => '2026-11-20T15:30:00+07:00',
        ])->assertCreated();

        $session = AttendanceSession::findOrFail($response->json('data.id'));

        $this->assertSame('2026-11-20 07:00:00', $session->starts_at->utc()->format('Y-m-d H:i:s'));
        $this->assertSame('2026-11-20 07:15:00', $session->late_after->utc()->format('Y-m-d H:i:s'));
        $this->assertSame('2026-11-20 08:30:00', $session->closes_at->utc()->format('Y-m-d H:i:s'));
        $this->assertSame('2026-11-20T07:00:00+00:00', $response->json('data.starts_at'));
    }

    public function test_local_qr_test_is_disabled_by_default_even_for_teacher(): void
    {
        [$teacher, $section, $room] = $this->assignedTeacher();
        $session = AttendanceSession::factory()->create([
            'teacher_id' => $teacher->id,
            'class_section_id' => $section->id,
            'classroom_id' => $room->id,
        ]);
        config()->set('attendance.allow_local_qr_testing', false);

        $this->postJson("/api/v1/teacher/attendance-sessions/{$session->id}/local-qr-test")
            ->assertNotFound();
    }

    public function test_local_qr_test_updates_only_owned_open_session_and_issues_valid_qr(): void
    {
        [$teacher, $section, $room] = $this->assignedTeacher();
        config()->set('attendance.allow_local_qr_testing', true);

        $session = AttendanceSession::factory()->create([
            'teacher_id' => $teacher->id,
            'class_section_id' => $section->id,
            'classroom_id' => $room->id,
            'session_date' => now('Asia/Phnom_Penh')->toDateString(),
            'starts_at' => now()->addHours(6),
            'late_after' => now()->addHours(6)->addMinutes(15),
            'closes_at' => now()->addHours(8),
            'session_ends_at' => now()->addHours(8),
        ]);

        $this->postJson("/api/v1/teacher/attendance-sessions/{$session->id}/local-qr-test")
            ->assertOk()
            ->assertJsonPath('data.id', $session->id)
            ->assertJsonPath('data.local_qr_testing_available', true);

        $session->refresh();
        $this->assertTrue(now()->between($session->starts_at, $session->closes_at));
        $this->assertTrue(now()->between($session->starts_at, $session->late_after));
        $this->assertSame(30, (int) round($session->starts_at->diffInMinutes($session->closes_at)));

        $this->postJson("/api/v1/teacher/attendance-sessions/{$session->id}/qr-token")
            ->assertCreated()
            ->assertJsonStructure(['data' => ['token', 'expires_at']]);
    }

    public function test_local_qr_test_rejects_other_teachers_session(): void
    {
        config()->set('attendance.allow_local_qr_testing', true);
        $session = AttendanceSession::factory()->create([
            'session_date' => now('Asia/Phnom_Penh')->toDateString(),
        ]);
        Sanctum::actingAs(Teacher::factory()->create()->user);

        $this->postJson("/api/v1/teacher/attendance-sessions/{$session->id}/local-qr-test")
            ->assertForbidden();
    }

    public function test_local_qr_test_rejects_closed_session(): void
    {
        [$teacher, $section, $room] = $this->assignedTeacher();
        config()->set('attendance.allow_local_qr_testing', true);
        $session = AttendanceSession::factory()->closed()->create([
            'teacher_id' => $teacher->id,
            'class_section_id' => $section->id,
            'classroom_id' => $room->id,
            'session_date' => now('Asia/Phnom_Penh')->toDateString(),
        ]);

        $this->postJson("/api/v1/teacher/attendance-sessions/{$session->id}/local-qr-test")
            ->assertStatus(409);
    }

    public function test_unassigned_teacher_cannot_open_attendance_session(): void
    {
        $teacher = Teacher::factory()->create();
        Sanctum::actingAs($teacher->user);
        $classSection = ClassSection::factory()->create();
        $classroom = Classroom::factory()->create();

        $this->postJson('/api/v1/teacher/attendance-sessions', $this->sessionPayload($classSection, $classroom))
            ->assertForbidden();
    }

    public function test_teacher_cannot_open_two_sessions_for_same_section(): void
    {
        [, $classSection, $classroom] = $this->assignedTeacher();
        $payload = $this->sessionPayload($classSection, $classroom);

        $this->postJson('/api/v1/teacher/attendance-sessions', $payload)->assertCreated();

        $this->postJson('/api/v1/teacher/attendance-sessions', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('class_section_id');
    }

    public function test_teacher_cannot_create_a_duplicate_session_for_a_scheduled_meeting(): void
    {
        [$teacher, $classSection, $classroom] = $this->assignedTeacher();
        $schedule = ClassSchedule::factory()->create([
            'class_section_id' => $classSection->id,
            'classroom_id' => $classroom->id,
            'day_of_week' => 1,
            'start_time' => '07:30:00',
            'end_time' => '09:00:00',
        ]);
        $payload = [
            'class_section_id' => $classSection->id,
            'class_schedule_id' => $schedule->id,
            'session_date' => '2025-03-03',
            'starts_at' => '2025-03-03T07:30:00+07:00',
            'late_after' => '2025-03-03T07:45:00+07:00',
            'closes_at' => '2025-03-03T09:00:00+07:00',
        ];

        $sessionId = $this->postJson('/api/v1/teacher/attendance-sessions', $payload)
            ->assertCreated()->json('data.id');
        AttendanceSession::query()->whereKey($sessionId)->update(['status' => AttendanceSessionStatus::Closed->value]);

        $this->postJson('/api/v1/teacher/attendance-sessions', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('class_schedule_id');
    }

    public function test_teacher_can_generate_and_rotate_qr_token(): void
    {
        [, $classSection, $classroom] = $this->assignedTeacher();
        $sessionId = $this->postJson(
            '/api/v1/teacher/attendance-sessions',
            $this->sessionPayload($classSection, $classroom)
        )->assertCreated()->json('data.id');

        $first = $this->postJson("/api/v1/teacher/attendance-sessions/{$sessionId}/qr-token")
            ->assertCreated()
            ->assertJsonStructure(['data' => ['token', 'expires_at']])
            ->json('data.token');

        $this->assertDatabaseHas('attendance_qr_tokens', [
            'attendance_session_id' => $sessionId,
            'token_hash' => hash('sha256', $first),
            'revoked_at' => null,
        ]);

        $second = $this->postJson("/api/v1/teacher/attendance-sessions/{$sessionId}/qr-token")
            ->assertCreated()
            ->json('data.token');

        $this->assertNotSame($first, $second);
        $this->assertDatabaseMissing('attendance_qr_tokens', [
            'attendance_session_id' => $sessionId,
            'token_hash' => hash('sha256', $first),
            'revoked_at' => null,
        ]);
    }

    public function test_teacher_cannot_generate_qr_for_closed_session(): void
    {
        $teacher = Teacher::factory()->create();
        Sanctum::actingAs($teacher->user);
        $session = AttendanceSession::factory()->closed()->create([
            'teacher_id' => $teacher->id,
        ]);

        $this->postJson("/api/v1/teacher/attendance-sessions/{$session->id}/qr-token")
            ->assertStatus(409);
    }

    public function test_teacher_cannot_access_another_teachers_session(): void
    {
        $other = Teacher::factory()->create();
        $session = AttendanceSession::factory()->create();
        Sanctum::actingAs($other->user);

        $this->getJson("/api/v1/teacher/attendance-sessions/{$session->id}")
            ->assertForbidden();
    }

    public function test_teacher_can_close_session_and_absences_are_finalized(): void
    {
        [$teacher, $classSection, $classroom] = $this->assignedTeacher();
        $session = AttendanceSession::factory()->create([
            'teacher_id' => $teacher->id,
            'class_section_id' => $classSection->id,
            'classroom_id' => $classroom->id,
        ]);

        $presentStudent = Student::factory()->create();
        $absentStudent = Student::factory()->create();

        Enrollment::factory()->create([
            'class_section_id' => $classSection->id,
            'student_id' => $presentStudent->id,
        ]);
        Enrollment::factory()->create([
            'class_section_id' => $classSection->id,
            'student_id' => $absentStudent->id,
        ]);
        Attendance::factory()->create([
            'attendance_session_id' => $session->id,
            'student_id' => $presentStudent->id,
            'status' => AttendanceStatus::Present,
        ]);

        $this->postJson("/api/v1/teacher/attendance-sessions/{$session->id}/close")
            ->assertOk()
            ->assertJsonPath('data.status', AttendanceSessionStatus::Closed->value)
            ->assertJsonPath('summary.present', 1)
            ->assertJsonPath('summary.absent', 1)
            ->assertJsonPath('summary.total', 2);

        $this->assertDatabaseHas('attendances', [
            'attendance_session_id' => $session->id,
            'student_id' => $absentStudent->id,
            'status' => AttendanceStatus::Absent->value,
            'verification_method' => VerificationMethod::System->value,
        ]);
        $this->assertDatabaseHas('attendance_sessions', [
            'id' => $session->id,
            'status' => AttendanceSessionStatus::Closed->value,
        ]);
    }

    public function test_teacher_cannot_close_already_closed_session(): void
    {
        $teacher = Teacher::factory()->create();
        Sanctum::actingAs($teacher->user);
        $session = AttendanceSession::factory()->closed()->create([
            'teacher_id' => $teacher->id,
        ]);

        $this->postJson("/api/v1/teacher/attendance-sessions/{$session->id}/close")
            ->assertStatus(409);
    }

    public function test_assigned_teacher_can_manually_mark_an_enrolled_student(): void
    {
        [$teacher, $classSection, $classroom] = $this->assignedTeacher();
        $session = AttendanceSession::factory()->create([
            'teacher_id' => $teacher->id,
            'class_section_id' => $classSection->id,
            'classroom_id' => $classroom->id,
        ]);
        $student = Student::factory()->create();
        Enrollment::factory()->create(['class_section_id' => $classSection->id, 'student_id' => $student->id]);

        $this->postJson("/api/v1/teacher/attendance-sessions/{$session->id}/attendance/manual", [
            'records' => [['student_id' => $student->id, 'status' => AttendanceStatus::Present->value]],
        ])->assertOk()
            ->assertJsonPath('summary.present', 1)
            ->assertJsonPath('summary.unmarked', 0);

        $this->assertDatabaseHas('attendances', [
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => AttendanceStatus::Present->value,
            'verification_method' => VerificationMethod::Manual->value,
            'marked_by' => $teacher->user_id,
        ]);
    }

    public function test_assigned_teacher_can_update_qr_attendance_and_save_permission_reason(): void
    {
        [$teacher, $classSection, $classroom] = $this->assignedTeacher();
        $session = AttendanceSession::factory()->create([
            'teacher_id' => $teacher->id,
            'class_section_id' => $classSection->id,
            'classroom_id' => $classroom->id,
        ]);
        $student = Student::factory()->create();
        Enrollment::factory()->create(['class_section_id' => $classSection->id, 'student_id' => $student->id]);
        $attendance = Attendance::factory()->create([
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => AttendanceStatus::Present->value,
            'verification_method' => VerificationMethod::DynamicQr->value,
        ]);

        $this->postJson("/api/v1/teacher/attendance-sessions/{$session->id}/attendance/manual", [
            'records' => [['student_id' => $student->id, 'status' => AttendanceStatus::Excused->value, 'remarks' => 'Approved medical leave']],
        ])->assertOk()
            ->assertJsonPath('summary.excused', 1)
            ->assertJsonPath('summary.present', 0);

        $this->assertDatabaseHas('attendances', [
            'id' => $attendance->id,
            'status' => AttendanceStatus::Excused->value,
            'verification_method' => VerificationMethod::Manual->value,
            'remarks' => 'Approved medical leave',
            'marked_by' => $teacher->user_id,
        ]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'attendance.manual_updated', 'entity_id' => $attendance->id]);
    }

    public function test_unassigned_teacher_cannot_change_attendance_records(): void
    {
        $session = AttendanceSession::factory()->create();
        $student = Student::factory()->create();
        Enrollment::factory()->create(['class_section_id' => $session->class_section_id, 'student_id' => $student->id]);
        Sanctum::actingAs(Teacher::factory()->create()->user);

        $this->postJson("/api/v1/teacher/attendance-sessions/{$session->id}/attendance/manual", [
            'records' => [['student_id' => $student->id, 'status' => AttendanceStatus::Present->value]],
        ])->assertForbidden();

        $this->assertDatabaseMissing('attendances', [
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
        ]);
    }
}
