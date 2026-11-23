<?php

namespace Tests\Feature\Api\V1;

use App\Enums\AttendanceStatus;
use App\Enums\UserRole;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\ClassSection;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use App\Models\User;
use App\Models\GradePolicy;
use App\Modules\Grades\Services\GradebookService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GradebookApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_attendance_score_uses_only_closed_finalized_sessions_and_excludes_unrecorded_by_default(): void
    {
        $section = ClassSection::factory()->create();
        $section->semester->update(['start_date' => '2025-01-01', 'end_date' => '2025-12-31']);
        $student = Student::factory()->create();
        GradePolicy::create(['semester_id' => $section->semester_id]);
        $present = AttendanceSession::factory()->closed()->create(['class_section_id' => $section->id, 'session_date' => '2025-03-01']);
        Attendance::factory()->create(['attendance_session_id' => $present->id, 'student_id' => $student->id, 'status' => AttendanceStatus::Present]);
        AttendanceSession::factory()->closed()->create(['class_section_id' => $section->id, 'session_date' => '2025-03-02']); // Missing record is excluded.
        AttendanceSession::factory()->create(['class_section_id' => $section->id, 'session_date' => '2025-03-03']); // Open session is ignored.

        $score = app(GradebookService::class)->attendanceScore($section, $student, GradePolicy::where('semester_id', $section->semester_id)->first());

        $this->assertSame(10.0, $score['score']);
        $this->assertSame(2, $score['finalized_sessions']);
        $this->assertSame(1, $score['counted_sessions']);
        $this->assertSame(1, $score['excluded_unrecorded_sessions']);
    }

    public function test_teacher_can_only_access_gradebook_for_assigned_sections_and_module_toggle_is_enforced(): void
    {
        $teacherUser = User::factory()->create(['role' => UserRole::Teacher]);
        $teacher = Teacher::factory()->create(['user_id' => $teacherUser->id]);
        $section = ClassSection::factory()->create();
        $otherSection = ClassSection::factory()->create();
        TeacherAssignment::factory()->create(['class_section_id' => $section->id, 'teacher_id' => $teacher->id]);
        Sanctum::actingAs($teacherUser);

        $this->getJson("/api/v1/teacher/gradebook/{$section->id}")->assertOk();
        $this->getJson("/api/v1/teacher/gradebook/{$otherSection->id}")->assertForbidden();
        \App\Models\RoleModulePermission::where('role', 'teacher')->where('module', 'grades')->update(['enabled' => false]);
        $this->getJson('/api/v1/teacher/gradebook/sections')->assertForbidden();
    }

    public function test_grade_score_limits_and_finalization_are_validated(): void
    {
        $admin = User::factory()->admin()->create();
        $section = ClassSection::factory()->create();
        $student = Student::factory()->create();
        Enrollment::factory()->create(['class_section_id' => $section->id, 'student_id' => $student->id]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/admin/gradebook/{$section->id}/{$student->id}", ['activities_score' => 11])
            ->assertUnprocessable();
        $this->patchJson("/api/v1/admin/gradebook/{$section->id}/{$student->id}", ['activities_score' => 8, 'midterm_score' => 24, 'final_score' => 45, 'finalize' => true])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('finalize');
    }

    public function test_student_can_only_list_their_published_results(): void
    {
        $student = Student::factory()->create();
        $section = ClassSection::factory()->create();
        Enrollment::factory()->create(['class_section_id' => $section->id, 'student_id' => $student->id]);
        Sanctum::actingAs($student->user);

        $this->getJson('/api/v1/student/semester-results')->assertOk()->assertJsonPath('data.students', []);
    }

    public function test_admin_can_finalize_approve_publish_and_export_a_frozen_result_sheet(): void
    {
        $admin = User::factory()->admin()->create();
        $section = ClassSection::factory()->create();
        $section->semester->update(['start_date' => '2025-01-01', 'end_date' => '2025-12-31']);
        $student = Student::factory()->create();
        Enrollment::factory()->create(['class_section_id' => $section->id, 'student_id' => $student->id]);
        $session = AttendanceSession::factory()->closed()->create(['class_section_id' => $section->id, 'session_date' => '2025-03-01']);
        Attendance::factory()->create(['attendance_session_id' => $session->id, 'student_id' => $student->id, 'status' => AttendanceStatus::Present]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/admin/gradebook/{$section->id}/{$student->id}", ['activities_score' => 9, 'midterm_score' => 27, 'final_score' => 48, 'finalize' => true])->assertOk()->assertJsonPath('data.total', 94);
        $this->postJson("/api/v1/admin/semester-results/{$section->id}/approve")->assertOk()->assertJsonPath('data.status', 'approved');

        Attendance::where('attendance_session_id', $session->id)->update(['status' => AttendanceStatus::Absent]);
        $this->getJson("/api/v1/admin/gradebook/{$section->id}")->assertOk()->assertJsonPath('data.0.attendance.score', 10)->assertJsonPath('data.0.total', 94);
        $this->patchJson("/api/v1/admin/gradebook/{$section->id}/{$student->id}", ['final_score' => 49])->assertStatus(423);

        $this->postJson("/api/v1/admin/semester-results/{$section->id}/publish")->assertOk()->assertJsonPath('data.status', 'published');
        Sanctum::actingAs($student->user);
        $this->getJson('/api/v1/student/semester-results')->assertOk()->assertJsonPath('data.students.0.status', 'pass');
        Sanctum::actingAs($admin);
        $this->get("/api/v1/admin/semester-results/{$section->id}/pdf")->assertOk()->assertHeader('content-type', 'application/pdf');
    }

    public function test_grade_policy_component_points_must_sum_to_one_hundred(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());
        $semester = \App\Models\Semester::factory()->create();
        $this->putJson("/api/v1/admin/semesters/{$semester->id}/grade-policy", [
            'attendance_points' => 10, 'activities_points' => 10, 'midterm_points' => 30, 'final_points' => 49,
            'pass_threshold' => 50, 'late_credit' => 0.5, 'permission_credit' => 1, 'absent_credit' => 0,
            'missing_attendance_policy' => 'exclude', 'require_all_subjects_pass' => false,
            'max_subject_offerings' => 5, 'weekly_contact_hours' => 2,
        ])->assertUnprocessable()->assertJsonValidationErrors('points');
    }
}
