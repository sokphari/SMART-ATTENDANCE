<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\AttendanceStatus;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\ClassSection;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_guest_cannot_list_attendance(): void
    {
        $this->getJson('/api/v1/admin/attendance')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_attendance(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/attendance')->assertForbidden();
    }

    public function test_admin_can_list_attendance(): void
    {
        $this->actingAsAdmin();
        Attendance::factory()->create();

        $this->getJson('/api/v1/admin/attendance')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id',
                    'attendance_session_id',
                    'session' => [
                        'id',
                        'class_section_id',
                        'teacher' => ['id', 'teacher_code', 'user' => ['id', 'name']],
                        'classroom' => ['id', 'room_code'],
                    ],
                    'student_id',
                    'student' => ['id', 'student_code', 'user' => ['id', 'name', 'email']],
                    'status',
                    'verification_method',
                    'latitude',
                    'longitude',
                    'checked_in_at',
                ]],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_filter_attendance(): void
    {
        $this->actingAsAdmin();
        $session = AttendanceSession::factory()->create();
        $present = Attendance::factory()->create([
            'attendance_session_id' => $session->id,
            'status' => AttendanceStatus::Present,
        ]);
        Attendance::factory()->create([
            'status' => AttendanceStatus::Absent,
        ]);

        $this->getJson("/api/v1/admin/attendance?attendance_session_id={$session->id}&status=present")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $present->id);
    }

    public function test_guest_cannot_view_attendance_report(): void
    {
        $this->getJson('/api/v1/admin/reports/attendance')->assertUnauthorized();
    }

    public function test_non_admin_cannot_view_attendance_report(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/reports/attendance')->assertForbidden();
    }

    public function test_admin_can_view_attendance_report(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->create(['section_code' => 'A']);
        $session = AttendanceSession::factory()->create([
            'class_section_id' => $classSection->id,
        ]);
        $students = Student::factory()->count(3)->create();

        Attendance::factory()->create([
            'attendance_session_id' => $session->id,
            'student_id' => $students[0]->id,
            'status' => AttendanceStatus::Present,
        ]);
        Attendance::factory()->create([
            'attendance_session_id' => $session->id,
            'student_id' => $students[1]->id,
            'status' => AttendanceStatus::Late,
        ]);
        Attendance::factory()->absent()->create([
            'attendance_session_id' => $session->id,
            'student_id' => $students[2]->id,
        ]);

        $otherSection = ClassSection::factory()->create();
        $otherSession = AttendanceSession::factory()->create([
            'class_section_id' => $otherSection->id,
        ]);
        Attendance::factory()->absent()->create([
            'attendance_session_id' => $otherSession->id,
        ]);

        $this->getJson("/api/v1/admin/reports/attendance?class_section_id={$classSection->id}")
            ->assertOk()
            ->assertJsonPath('data.total', 3)
            ->assertJsonPath('data.by_status.present', 1)
            ->assertJsonPath('data.by_status.late', 1)
            ->assertJsonPath('data.by_status.absent', 1)
            ->assertJsonPath('data.by_status.excused', 0)
            ->assertJsonPath('data.attendance_rate', 66.67)
            ->assertJsonCount(1, 'data.by_section')
            ->assertJsonPath('data.by_section.0.class_section_id', $classSection->id)
            ->assertJsonPath('data.by_section.0.total', 3)
            ->assertJsonPath('data.by_section.0.attendance_rate', 66.67);
    }

    public function test_attendance_report_handles_empty_data(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/v1/admin/reports/attendance')
            ->assertOk()
            ->assertJsonPath('data.total', 0)
            ->assertJsonPath('data.attendance_rate', 0)
            ->assertJsonCount(0, 'data.by_section');
    }
}
