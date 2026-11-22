<?php

namespace Tests\Feature\Api\V1\Student;

use App\Enums\AttendanceStatus;
use App\Models\Attendance;
use App\Models\AttendanceQrToken;
use App\Models\AttendanceSession;
use App\Models\ClassSection;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class LocalStudentCheckInApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app()->detectEnvironment(fn () => 'local');
        config()->set('attendance.allow_local_qr_testing', true);
    }

    /** @return array{0: Student, 1: Student, 2: AttendanceSession, 3: string} */
    private function scenario(): array
    {
        $class = ClassSection::factory()->create();
        $first = Student::factory()->create();
        $second = Student::factory()->create();
        Enrollment::factory()->create(['class_section_id' => $class->id, 'student_id' => $first->id]);
        Enrollment::factory()->create(['class_section_id' => $class->id, 'student_id' => $second->id]);
        $session = AttendanceSession::factory()->create([
            'teacher_id' => Teacher::factory()->create()->id,
            'class_section_id' => $class->id,
            'starts_at' => now()->subMinute(),
            'late_after' => now()->addMinutes(15),
            'closes_at' => now()->addHour(),
            'session_ends_at' => now()->addHour(),
        ]);
        $token = 'local-scan-'.Str::random(40);
        AttendanceQrToken::factory()->create([
            'attendance_session_id' => $session->id,
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addHour(),
        ]);
        return [$first, $second, $session, $token];
    }

    private function data(Student $student, string $token, string $device): array
    {
        return [
            'attendance_id' => $student->attendanceId(),
            'device_id' => $device,
            'token' => $token,
            'latitude' => 11.5564,
            'longitude' => 104.9282,
            'gps_accuracy_meters' => 10,
        ];
    }

    public function test_nine_digit_ids_are_stable_and_unique(): void
    {
        $first = Student::factory()->create();
        $second = Student::factory()->create();
        $this->assertSame(str_pad((string) $first->id, 9, '0', STR_PAD_LEFT), $first->attendanceId());
        $this->assertSame(str_pad((string) $second->id, 9, '0', STR_PAD_LEFT), $second->attendanceId());
        $this->assertNotSame($first->attendanceId(), $second->attendanceId());

        $synthetic = new Student();
        $synthetic->id = 60001;
        $this->assertSame('000060001', $synthetic->attendanceId());
    }

    public function test_id_only_local_scan_records_present(): void
    {
        [$first, , $session, $token] = $this->scenario();
        $this->postJson('/api/v1/attendance/local-check-in', $this->data($first, $token, (string) Str::uuid()))
            ->assertCreated()
            ->assertJsonPath('data.status', 'present')
            ->assertJsonPath('data.student_id', $first->id);
        $this->assertDatabaseHas('attendances', [
            'attendance_session_id' => $session->id,
            'student_id' => $first->id,
            'status' => AttendanceStatus::Present->value,
        ]);
    }

    public function test_student_cannot_repeat_check_in_even_with_another_device(): void
    {
        [$first, , , $token] = $this->scenario();
        $this->postJson('/api/v1/attendance/local-check-in', $this->data($first, $token, (string) Str::uuid()))->assertCreated();
        $this->postJson('/api/v1/attendance/local-check-in', $this->data($first, $token, (string) Str::uuid()))->assertStatus(409);
    }

    public function test_device_cannot_check_in_for_two_students_in_same_session(): void
    {
        [$first, $second, , $token] = $this->scenario();
        $device = (string) Str::uuid();
        $this->postJson('/api/v1/attendance/local-check-in', $this->data($first, $token, $device))->assertCreated();
        $this->postJson('/api/v1/attendance/local-check-in', $this->data($second, $token, $device))->assertStatus(409);
        $this->assertSame(1, Attendance::count());
    }

    public function test_local_scan_is_not_available_if_flag_is_off(): void
    {
        [, , , $token] = $this->scenario();
        config()->set('attendance.allow_local_qr_testing', false);
        $this->postJson('/api/v1/attendance/local-check-in', ['token' => $token])->assertForbidden();
        $this->getJson('/api/v1/attendance/local-scan-availability')->assertOk()->assertJsonPath('enabled', false);
    }

    public function test_invalid_student_id_is_rejected(): void
    {
        [, , , $token] = $this->scenario();
        $this->postJson('/api/v1/attendance/local-check-in', [
            'token' => $token, 'attendance_id' => '000060001', 'device_id' => (string) Str::uuid(),
            'latitude' => 11.5564, 'longitude' => 104.9282, 'gps_accuracy_meters' => 10,
        ])->assertStatus(422);
    }

    public function test_expired_or_closed_session_does_not_register_attendance(): void
    {
        [$first, , $session, $token] = $this->scenario();
        $session->update(['closes_at' => now()->subSecond(), 'session_ends_at' => now()->subSecond()]);
        $this->postJson('/api/v1/attendance/local-check-in', $this->data($first, $token, (string) Str::uuid()))
            ->assertStatus(422);
        $this->assertDatabaseCount('attendances', 0);
    }
}
