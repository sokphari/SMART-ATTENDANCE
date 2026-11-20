<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\AcademicPeriodStatus;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Course;
use App\Models\Department;
use App\Models\Program;
use App\Models\Semester;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AcademicSetupApiTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());
    }

    public function test_admin_can_create_program_and_building_floor_hierarchy(): void
    {
        $this->admin();
        $department = Department::factory()->create();
        $this->postJson('/api/v1/admin/programs', [
            'department_id' => $department->id,
            'code' => 'CS',
            'name' => 'Computer Science',
        ])->assertCreated()->assertJsonPath('data.code', 'CS');

        $building = $this->postJson('/api/v1/admin/buildings', ['code' => 'BLD-A', 'name' => 'Building A'])
            ->assertCreated()->json('data.id');
        $this->postJson("/api/v1/admin/buildings/{$building}/floors", ['floor_number' => 1, 'name' => 'Floor 1'])
            ->assertCreated()->assertJsonPath('data.building_id', $building);
        $this->getJson("/api/v1/admin/buildings/{$building}/floors?status=active")
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_class_setup_saves_section_teacher_and_multiple_schedule_rows_together(): void
    {
        $this->admin();
        $department = Department::factory()->create();
        $course = Course::factory()->create(['department_id' => $department->id]);
        $year = AcademicYear::factory()->active()->create(['start_date' => '2025-01-01', 'end_date' => '2025-12-31']);
        $semester = Semester::factory()->create([
            'academic_year_id' => $year->id,
            'start_date' => '2025-01-01',
            'end_date' => '2025-06-30',
            'status' => AcademicPeriodStatus::Active,
        ]);
        $teacher = Teacher::factory()->create(['department_id' => $department->id]);
        $classroom = Classroom::factory()->create(['capacity' => 40]);

        $response = $this->postJson('/api/v1/admin/class-sections', [
            'course_id' => $course->id,
            'semester_id' => $semester->id,
            'section_code' => 'A',
            'capacity' => 30,
            'year_level' => 2,
            'teacher_id' => $teacher->id,
            'class_start_date' => '2025-01-10',
            'class_end_date' => '2025-06-20',
            'schedules' => [
                ['classroom_id' => $classroom->id, 'day_of_week' => 1, 'start_time' => '10:00', 'end_time' => '11:00'],
                ['classroom_id' => $classroom->id, 'day_of_week' => 3, 'start_time' => '10:00', 'end_time' => '11:00'],
            ],
        ])->assertCreated();

        $sectionId = $response->json('data.id');
        $this->assertNotEmpty($response->json('data.class_code'));
        $this->assertDatabaseHas('teacher_assignments', ['class_section_id' => $sectionId, 'teacher_id' => $teacher->id]);
        $this->assertDatabaseCount('class_schedules', 2);
    }

    public function test_class_setup_rejects_room_capacity_below_section_capacity_without_partial_records(): void
    {
        $this->admin();
        $course = Course::factory()->create();
        $year = AcademicYear::factory()->active()->create(['start_date' => '2025-01-01', 'end_date' => '2025-12-31']);
        $semester = Semester::factory()->create(['academic_year_id' => $year->id, 'start_date' => '2025-01-01', 'end_date' => '2025-06-30', 'status' => AcademicPeriodStatus::Active]);
        $teacher = Teacher::factory()->create(['department_id' => $course->department_id]);
        $room = Classroom::factory()->create(['capacity' => 20]);

        $this->postJson('/api/v1/admin/class-sections', [
            'course_id' => $course->id,
            'semester_id' => $semester->id,
            'section_code' => 'A',
            'capacity' => 30,
            'teacher_id' => $teacher->id,
            'class_start_date' => '2025-01-10',
            'class_end_date' => '2025-06-20',
            'schedules' => [['classroom_id' => $room->id, 'day_of_week' => 1, 'start_time' => '10:00', 'end_time' => '11:00']],
        ])->assertUnprocessable()->assertJsonValidationErrors('classroom_id');

        $this->assertDatabaseCount('class_sections', 0);
        $this->assertDatabaseCount('teacher_assignments', 0);
        $this->assertDatabaseCount('class_schedules', 0);
    }

    public function test_eligible_student_suggestions_filter_department_program_and_year(): void
    {
        $this->admin();
        $department = Department::factory()->create();
        $program = Program::create(['department_id' => $department->id, 'code' => 'SCI', 'name' => 'Science', 'status' => 'active']);
        $course = Course::factory()->create(['department_id' => $department->id, 'program_id' => $program->id]);
        $section = \App\Models\ClassSection::factory()->create(['course_id' => $course->id, 'program_id' => $program->id, 'year_level' => 2]);
        $eligible = Student::factory()->create(['department_id' => $department->id, 'program_id' => $program->id, 'year_level' => 2]);
        Student::factory()->create(['department_id' => $department->id, 'program_id' => $program->id, 'year_level' => 1]);
        Student::factory()->create(['department_id' => $department->id, 'program_id' => null, 'year_level' => 2]);

        $this->getJson("/api/v1/admin/class-sections/{$section->id}/eligible-students")
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $eligible->id);
    }
}
