<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\AccountStatus;
use App\Models\ClassSection;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TeacherAssignmentApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_guest_cannot_list_teacher_assignments(): void
    {
        $this->getJson('/api/v1/admin/teacher-assignments')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_teacher_assignments(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/teacher-assignments')->assertForbidden();
    }

    public function test_admin_can_list_teacher_assignments(): void
    {
        $this->actingAsAdmin();
        TeacherAssignment::factory()->create();

        $this->getJson('/api/v1/admin/teacher-assignments')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id',
                    'class_section_id',
                    'class_section' => ['id', 'section_code'],
                    'teacher_id',
                    'teacher' => ['id', 'teacher_code', 'user' => ['id', 'name', 'email']],
                    'assigned_at',
                ]],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_assign_teacher_to_class_section(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->create();
        $teacher = Teacher::factory()->create();

        $this->postJson('/api/v1/admin/teacher-assignments', [
            'class_section_id' => $classSection->id,
            'teacher_id' => $teacher->id,
        ])->assertCreated()
            ->assertJsonPath('data.class_section_id', $classSection->id)
            ->assertJsonPath('data.teacher_id', $teacher->id)
            ->assertJsonPath('data.class_section.id', $classSection->id)
            ->assertJsonPath('data.teacher.id', $teacher->id);

        $this->assertDatabaseHas('teacher_assignments', [
            'class_section_id' => $classSection->id,
            'teacher_id' => $teacher->id,
        ]);
    }

    public function test_cannot_duplicate_teacher_assignment(): void
    {
        $this->actingAsAdmin();
        $assignment = TeacherAssignment::factory()->create();

        $this->postJson('/api/v1/admin/teacher-assignments', [
            'class_section_id' => $assignment->class_section_id,
            'teacher_id' => $assignment->teacher_id,
        ])->assertStatus(422)->assertJsonValidationErrors('teacher_id');
    }

    public function test_cannot_assign_inactive_section_or_teacher(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->inactive()->create();
        $teacher = Teacher::factory()->create();
        $teacher->user->update(['status' => AccountStatus::Inactive->value]);

        $this->postJson('/api/v1/admin/teacher-assignments', [
            'class_section_id' => $classSection->id,
            'teacher_id' => $teacher->id,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['class_section_id', 'teacher_id']);
    }

    public function test_admin_can_show_teacher_assignment(): void
    {
        $this->actingAsAdmin();
        $assignment = TeacherAssignment::factory()->create();

        $this->getJson("/api/v1/admin/teacher-assignments/{$assignment->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $assignment->id);
    }

    public function test_admin_can_update_teacher_assignment(): void
    {
        $this->actingAsAdmin();
        $assignment = TeacherAssignment::factory()->create();
        $otherTeacher = Teacher::factory()->create();

        $this->patchJson("/api/v1/admin/teacher-assignments/{$assignment->id}", [
            'teacher_id' => $otherTeacher->id,
        ])->assertOk()
            ->assertJsonPath('data.teacher_id', $otherTeacher->id);
    }

    public function test_admin_can_unassign_teacher(): void
    {
        $this->actingAsAdmin();
        $assignment = TeacherAssignment::factory()->create();

        $this->deleteJson("/api/v1/admin/teacher-assignments/{$assignment->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('teacher_assignments', ['id' => $assignment->id]);
    }

    public function test_admin_can_filter_teacher_assignments(): void
    {
        $this->actingAsAdmin();
        $assignment = TeacherAssignment::factory()->create();
        TeacherAssignment::factory()->create();

        $this->getJson("/api/v1/admin/teacher-assignments?class_section_id={$assignment->class_section_id}&teacher_id={$assignment->teacher_id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $assignment->id);
    }
}
