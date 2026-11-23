<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\AttendanceSessionStatus;
use App\Enums\AttendanceStatus;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\ClassSection;
use App\Models\Enrollment;
use App\Models\RoleModulePermission;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_daily_report_distinguishes_unrecorded_and_excludes_open_sessions(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());
        [$section, $students] = $this->sectionWithRoster(3);
        $closed = AttendanceSession::factory()->closed()->create([
            'class_section_id' => $section->id,
            'session_date' => '2026-11-18',
        ]);
        Attendance::factory()->create([
            'attendance_session_id' => $closed->id,
            'student_id' => $students[0]->id,
            'status' => AttendanceStatus::Present,
        ]);
        Attendance::factory()->absent()->create([
            'attendance_session_id' => $closed->id,
            'student_id' => $students[1]->id,
        ]);
        AttendanceSession::factory()->create([
            'class_section_id' => $section->id,
            'session_date' => '2026-11-18',
            'status' => AttendanceSessionStatus::Open,
        ]);

        $this->getJson('/api/v1/admin/reports/daily?date=2026-11-18')
            ->assertOk()
            ->assertJsonPath('data.summary.opportunities', 3)
            ->assertJsonPath('data.summary.present', 1)
            ->assertJsonPath('data.summary.absent', 1)
            ->assertJsonPath('data.summary.unrecorded', 1)
            ->assertJsonPath('data.summary.attendance_rate', 33.33)
            ->assertJsonPath('data.meta.total', 3)
            ->assertJsonFragment(['status' => 'unrecorded']);
    }

    public function test_weekly_report_uses_monday_through_sunday_boundaries(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());
        [$section, $students] = $this->sectionWithRoster(1);
        foreach (['2026-11-15', '2026-11-16', '2026-11-22', '2026-11-23'] as $date) {
            $session = AttendanceSession::factory()->closed()->create([
                'class_section_id' => $section->id,
                'session_date' => $date,
            ]);
            Attendance::factory()->create([
                'attendance_session_id' => $session->id,
                'student_id' => $students[0]->id,
                'status' => AttendanceStatus::Present,
            ]);
        }

        $this->getJson('/api/v1/admin/reports/weekly?week_start=2026-11-18')
            ->assertOk()
            ->assertJsonPath('data.period.from', '2026-11-16')
            ->assertJsonPath('data.period.to', '2026-11-22')
            ->assertJsonPath('data.summary.sessions', 2)
            ->assertJsonCount(7, 'data.daily_trend');
    }

    public function test_teacher_report_is_limited_to_assigned_sections_and_student_scope(): void
    {
        $user = User::factory()->create(['role' => 'teacher']);
        $teacher = Teacher::factory()->create(['user_id' => $user->id]);
        [$assigned, $students] = $this->sectionWithRoster(1);
        [$other] = $this->sectionWithRoster(1);
        TeacherAssignment::factory()->create(['teacher_id' => $teacher->id, 'class_section_id' => $assigned->id]);
        $session = AttendanceSession::factory()->closed()->create(['class_section_id' => $assigned->id]);
        Attendance::factory()->create(['attendance_session_id' => $session->id, 'student_id' => $students[0]->id]);
        Sanctum::actingAs($user);

        $this->getJson("/api/v1/teacher/reports/classes/{$assigned->id}")->assertOk();
        $this->getJson("/api/v1/teacher/reports/classes/{$other->id}")->assertNotFound();
        $this->getJson("/api/v1/teacher/reports/students/{$students[0]->id}")->assertOk();
    }

    public function test_teacher_reports_can_be_disabled_by_role_permission(): void
    {
        $user = User::factory()->create(['role' => 'teacher']);
        RoleModulePermission::query()->where('role', 'teacher')->where('module', 'attendance_reports')->update(['enabled' => false]);
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/teacher/reports/overview')->assertForbidden();
    }

    public function test_attendance_report_can_be_downloaded_as_csv_xlsx_and_pdf(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());
        [$section, $students] = $this->sectionWithRoster(1);
        $session = AttendanceSession::factory()->closed()->create(['class_section_id' => $section->id]);
        Attendance::factory()->create(['attendance_session_id' => $session->id, 'student_id' => $students[0]->id]);

        foreach (['csv', 'xlsx', 'pdf'] as $format) {
            $this->get("/api/v1/admin/reports/exports/attendance?format={$format}")
                ->assertOk()
                ->assertDownload();
        }
    }

    private function sectionWithRoster(int $count): array
    {
        $section = ClassSection::factory()->create();
        $students = Student::factory()->count($count)->create();
        foreach ($students as $student) {
            Enrollment::factory()->create([
                'class_section_id' => $section->id,
                'student_id' => $student->id,
                'enrollment_date' => '2026-01-01',
            ]);
        }

        return [$section, $students];
    }
}
