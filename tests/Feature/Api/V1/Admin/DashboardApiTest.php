<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\Classroom;
use App\Models\ClassSchedule;
use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrollment;
use App\Models\Semester;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_guest_cannot_view_dashboard(): void
    {
        $this->getJson('/api/v1/admin/dashboard')->assertUnauthorized();
    }

    public function test_non_admin_cannot_view_dashboard(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/dashboard')->assertForbidden();
    }

    public function test_dashboard_returns_expected_structure(): void
    {
        $this->actingAsAdmin();
        Student::factory()->create();

        $this->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'counts' => [
                        'users',
                        'departments',
                        'students',
                        'teachers',
                        'courses',
                        'class_sections',
                        'classrooms',
                        'teacher_assignments',
                        'enrollments',
                        'class_schedules',
                    ],
                    'trends' => [
                        'students_last_30_days',
                        'teachers_last_30_days',
                        'enrollments_last_30_days',
                        'schedules_last_30_days',
                    ],
                ],
            ])
            ->assertJsonPath('data.counts.users.admins', 1)
            ->assertJsonPath('data.counts.users.students', 1)
            ->assertJsonPath('data.counts.students.total', 1)
            ->assertJsonPath('data.counts.students.active', 1)
            ->assertJsonPath('data.trends.students_last_30_days', 1);
    }

    public function test_dashboard_counts_academic_resources(): void
    {
        $this->actingAsAdmin();
        $department = Department::factory()->create();
        $teacher = Teacher::factory()->create(['department_id' => $department->id]);
        $student = Student::factory()->create(['department_id' => $department->id]);
        $course = Course::factory()->create(['department_id' => $department->id]);
        $semester = Semester::factory()->create();
        $classSection = ClassSection::factory()->create([
            'course_id' => $course->id,
            'semester_id' => $semester->id,
        ]);
        $classroom = Classroom::factory()->create();
        TeacherAssignment::factory()->create([
            'class_section_id' => $classSection->id,
            'teacher_id' => $teacher->id,
        ]);
        Enrollment::factory()->create([
            'class_section_id' => $classSection->id,
            'student_id' => $student->id,
        ]);
        ClassSchedule::factory()->create([
            'class_section_id' => $classSection->id,
            'classroom_id' => $classroom->id,
        ]);

        $this->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.counts.users.total', 3)
            ->assertJsonPath('data.counts.users.admins', 1)
            ->assertJsonPath('data.counts.users.teachers', 1)
            ->assertJsonPath('data.counts.users.students', 1)
            ->assertJsonPath('data.counts.departments.total', 1)
            ->assertJsonPath('data.counts.departments.active', 1)
            ->assertJsonPath('data.counts.teachers.total', 1)
            ->assertJsonPath('data.counts.students.total', 1)
            ->assertJsonPath('data.counts.courses.total', 1)
            ->assertJsonPath('data.counts.courses.active', 1)
            ->assertJsonPath('data.counts.class_sections.total', 1)
            ->assertJsonPath('data.counts.class_sections.active', 1)
            ->assertJsonPath('data.counts.classrooms.total', 1)
            ->assertJsonPath('data.counts.classrooms.active', 1)
            ->assertJsonPath('data.counts.teacher_assignments.total', 1)
            ->assertJsonPath('data.counts.enrollments.total', 1)
            ->assertJsonPath('data.counts.enrollments.enrolled', 1)
            ->assertJsonPath('data.counts.enrollments.dropped', 0)
            ->assertJsonPath('data.counts.enrollments.completed', 0)
            ->assertJsonPath('data.counts.class_schedules.total', 1)
            ->assertJsonPath('data.trends.students_last_30_days', 1)
            ->assertJsonPath('data.trends.teachers_last_30_days', 1)
            ->assertJsonPath('data.trends.enrollments_last_30_days', 1)
            ->assertJsonPath('data.trends.schedules_last_30_days', 1);
    }
}
