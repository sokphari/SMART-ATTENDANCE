<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\ClassSectionStatus;
use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClassSectionApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_guest_cannot_list_class_sections(): void
    {
        $this->getJson('/api/v1/admin/class-sections')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_class_sections(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/class-sections')->assertForbidden();
    }

    public function test_admin_can_list_class_sections(): void
    {
        $this->actingAsAdmin();
        ClassSection::factory()->create();

        $this->getJson('/api/v1/admin/class-sections')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id',
                    'course_id',
                    'course' => ['id', 'course_code', 'name'],
                    'semester_id',
                    'semester' => ['id', 'name'],
                    'section_code',
                    'capacity',
                    'status',
                ]],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_create_class_section(): void
    {
        $this->actingAsAdmin();
        $course = Course::factory()->create();
        $semester = Semester::factory()->create();

        $this->postJson('/api/v1/admin/class-sections', [
            'course_id' => $course->id,
            'semester_id' => $semester->id,
            'section_code' => 'a',
            'capacity' => 40,
        ])->assertCreated()
            ->assertJsonPath('data.section_code', 'A')
            ->assertJsonPath('data.capacity', 40)
            ->assertJsonPath('data.status', ClassSectionStatus::Active->value)
            ->assertJsonPath('data.course.id', $course->id)
            ->assertJsonPath('data.semester.id', $semester->id);

        $this->assertDatabaseHas('class_sections', [
            'course_id' => $course->id,
            'semester_id' => $semester->id,
            'section_code' => 'A',
            'capacity' => 40,
        ]);
    }

    public function test_create_class_section_validates_unique_section_per_offering(): void
    {
        $this->actingAsAdmin();
        $course = Course::factory()->create();
        $semester = Semester::factory()->create();
        ClassSection::factory()->create([
            'course_id' => $course->id,
            'semester_id' => $semester->id,
            'section_code' => 'A',
        ]);

        $this->postJson('/api/v1/admin/class-sections', [
            'course_id' => $course->id,
            'semester_id' => $semester->id,
            'section_code' => 'A',
            'capacity' => 30,
        ])->assertStatus(422)->assertJsonValidationErrors('section_code');
    }

    public function test_same_section_code_allowed_for_different_course(): void
    {
        $this->actingAsAdmin();
        $course = Course::factory()->create();
        $otherCourse = Course::factory()->create([
            'department_id' => $course->department_id,
        ]);
        $semester = Semester::factory()->create();
        ClassSection::factory()->create([
            'course_id' => $course->id,
            'semester_id' => $semester->id,
            'section_code' => 'A',
        ]);

        $this->postJson('/api/v1/admin/class-sections', [
            'course_id' => $otherCourse->id,
            'semester_id' => $semester->id,
            'section_code' => 'A',
            'capacity' => 30,
        ])->assertCreated();
    }

    public function test_create_class_section_validates_relations_and_capacity(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/class-sections', [
            'course_id' => 99999,
            'semester_id' => 99999,
            'section_code' => 'A',
            'capacity' => 0,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['course_id', 'semester_id', 'capacity']);
    }

    public function test_admin_can_show_class_section(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->create();

        $this->getJson("/api/v1/admin/class-sections/{$classSection->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $classSection->id);
    }

    public function test_admin_can_update_class_section(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->create(['section_code' => 'A']);

        $this->patchJson("/api/v1/admin/class-sections/{$classSection->id}", [
            'section_code' => 'b',
            'capacity' => 55,
        ])->assertOk()
            ->assertJsonPath('data.section_code', 'B')
            ->assertJsonPath('data.capacity', 55);
    }

    public function test_admin_can_deactivate_class_section(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->create();

        $this->deleteJson("/api/v1/admin/class-sections/{$classSection->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('class_sections', [
            'id' => $classSection->id,
            'status' => ClassSectionStatus::Inactive->value,
        ]);
    }

    public function test_admin_can_filter_class_sections(): void
    {
        $this->actingAsAdmin();
        $course = Course::factory()->create(['course_code' => 'CS101']);
        $semester = Semester::factory()->create();
        ClassSection::factory()->create([
            'course_id' => $course->id,
            'semester_id' => $semester->id,
            'section_code' => 'A',
        ]);
        ClassSection::factory()->create();

        $this->getJson("/api/v1/admin/class-sections?course_id={$course->id}&semester_id={$semester->id}&search=CS101")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.course_id', $course->id);
    }
}
