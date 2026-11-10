<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\CourseStatus;
use App\Models\Course;
use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CourseApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_guest_cannot_list_courses(): void
    {
        $this->getJson('/api/v1/admin/courses')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_courses(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/courses')->assertForbidden();
    }

    public function test_admin_can_list_courses(): void
    {
        $this->actingAsAdmin();
        Course::factory()->create();

        $this->getJson('/api/v1/admin/courses')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id',
                    'department_id',
                    'department' => ['id', 'name', 'code'],
                    'course_code',
                    'name',
                    'description',
                    'credits',
                    'status',
                ]],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_create_course(): void
    {
        $this->actingAsAdmin();
        $department = Department::factory()->create();

        $this->postJson('/api/v1/admin/courses', [
            'department_id' => $department->id,
            'course_code' => 'cs101',
            'name' => 'Introduction to Programming',
            'description' => 'Fundamentals of programming.',
            'credits' => 3,
        ])->assertCreated()
            ->assertJsonPath('data.course_code', 'CS101')
            ->assertJsonPath('data.name', 'Introduction to Programming')
            ->assertJsonPath('data.credits', 3)
            ->assertJsonPath('data.status', CourseStatus::Active->value)
            ->assertJsonPath('data.department.id', $department->id);

        $this->assertDatabaseHas('courses', [
            'course_code' => 'CS101',
            'department_id' => $department->id,
            'credits' => 3,
        ]);
    }

    public function test_create_course_validates_duplicate_code(): void
    {
        $this->actingAsAdmin();
        $department = Department::factory()->create();
        Course::factory()->create(['course_code' => 'CS101']);

        $this->postJson('/api/v1/admin/courses', [
            'department_id' => $department->id,
            'course_code' => 'CS101',
            'name' => 'Another Course',
            'credits' => 3,
        ])->assertStatus(422)->assertJsonValidationErrors('course_code');
    }

    public function test_create_course_validates_department_and_credits(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/courses', [
            'department_id' => 99999,
            'course_code' => 'CS101',
            'name' => 'Another Course',
            'credits' => 0,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['department_id', 'credits']);
    }

    public function test_admin_can_show_course(): void
    {
        $this->actingAsAdmin();
        $course = Course::factory()->create();

        $this->getJson("/api/v1/admin/courses/{$course->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $course->id);
    }

    public function test_admin_can_update_course(): void
    {
        $this->actingAsAdmin();
        $course = Course::factory()->create();
        $department = Department::factory()->create();

        $this->patchJson("/api/v1/admin/courses/{$course->id}", [
            'name' => 'Updated Course',
            'department_id' => $department->id,
            'credits' => 4,
        ])->assertOk()
            ->assertJsonPath('data.name', 'Updated Course')
            ->assertJsonPath('data.credits', 4)
            ->assertJsonPath('data.department.id', $department->id);
    }

    public function test_admin_can_deactivate_course(): void
    {
        $this->actingAsAdmin();
        $course = Course::factory()->create();

        $this->deleteJson("/api/v1/admin/courses/{$course->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('courses', [
            'id' => $course->id,
            'status' => CourseStatus::Inactive->value,
        ]);
    }

    public function test_admin_can_filter_courses(): void
    {
        $this->actingAsAdmin();
        $department = Department::factory()->create();
        Course::factory()->create([
            'department_id' => $department->id,
            'course_code' => 'CS101',
            'status' => CourseStatus::Active,
        ]);
        Course::factory()->create(['course_code' => 'BA201']);

        $this->getJson("/api/v1/admin/courses?department_id={$department->id}&status=active&search=CS101")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.course_code', 'CS101');
    }
}
