<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\Classroom;
use App\Models\ClassSchedule;
use App\Models\ClassSection;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClassScheduleApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_guest_cannot_list_class_schedules(): void
    {
        $this->getJson('/api/v1/admin/class-schedules')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_class_schedules(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/class-schedules')->assertForbidden();
    }

    public function test_admin_can_list_class_schedules(): void
    {
        $this->actingAsAdmin();
        ClassSchedule::factory()->create();

        $this->getJson('/api/v1/admin/class-schedules')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id',
                    'class_section_id',
                    'class_section' => ['id', 'section_code'],
                    'classroom_id',
                    'classroom' => ['id', 'room_code'],
                    'day_of_week',
                    'start_time',
                    'end_time',
                    'effective_from',
                    'effective_until',
                ]],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_create_class_schedule(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->create();
        $classroom = Classroom::factory()->create();

        $this->postJson('/api/v1/admin/class-schedules', [
            'class_section_id' => $classSection->id,
            'classroom_id' => $classroom->id,
            'day_of_week' => 1,
            'start_time' => '10:00',
            'end_time' => '11:30',
            'effective_from' => '2025-02-01',
        ])->assertCreated()
            ->assertJsonPath('data.class_section_id', $classSection->id)
            ->assertJsonPath('data.classroom_id', $classroom->id)
            ->assertJsonPath('data.day_of_week', 1)
            ->assertJsonPath('data.start_time', '10:00:00')
            ->assertJsonPath('data.end_time', '11:30:00')
            ->assertJsonPath('data.effective_from', '2025-02-01');

        $this->assertDatabaseHas('class_schedules', [
            'class_section_id' => $classSection->id,
            'classroom_id' => $classroom->id,
            'day_of_week' => 1,
            'start_time' => '10:00:00',
            'end_time' => '11:30:00',
        ]);
    }

    public function test_admin_can_create_multiple_weekday_entries_from_a_configured_period(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->create();
        $classroom = Classroom::factory()->create();
        $timeSlotId = \App\Models\ScheduleTimeSlot::query()->where('code', 'morning-1')->value('id');

        $this->postJson('/api/v1/admin/class-schedules', [
            'class_section_id' => $classSection->id,
            'classroom_id' => $classroom->id,
            'time_slot_id' => $timeSlotId,
            'days_of_week' => [1, 3],
        ])->assertCreated()->assertJsonCount(2, 'data');

        $this->assertDatabaseCount('class_schedules', 2);
        $this->assertDatabaseHas('class_schedules', ['class_section_id' => $classSection->id, 'day_of_week' => 1, 'time_slot_id' => $timeSlotId, 'start_time' => '07:30:00']);
        $this->assertDatabaseHas('class_schedules', ['class_section_id' => $classSection->id, 'day_of_week' => 3, 'time_slot_id' => $timeSlotId, 'start_time' => '07:30:00']);
    }

    public function test_schedule_date_must_fit_inside_its_semester(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->create();
        $classroom = Classroom::factory()->create();

        $this->postJson('/api/v1/admin/class-schedules', [
            'class_section_id' => $classSection->id,
            'classroom_id' => $classroom->id,
            'day_of_week' => 1,
            'start_time' => '08:00',
            'end_time' => '09:00',
            'effective_from' => '2024-12-01',
        ])->assertStatus(422)->assertJsonValidationErrors('effective_from');
    }

    public function test_teacher_workload_uses_real_session_duration(): void
    {
        $this->actingAsAdmin();
        $teacher = Teacher::factory()->create();
        $section = ClassSection::factory()->create();
        TeacherAssignment::factory()->create(['class_section_id' => $section->id, 'teacher_id' => $teacher->id]);
        ClassSchedule::factory()->create(['class_section_id' => $section->id, 'day_of_week' => 1, 'start_time' => '07:30:00', 'end_time' => '09:00:00']);
        ClassSchedule::factory()->create(['class_section_id' => $section->id, 'day_of_week' => 2, 'start_time' => '14:00:00', 'end_time' => '15:30:00']);

        $this->getJson("/api/v1/admin/teachers/{$teacher->id}/workload?semester_id={$section->semester_id}")
            ->assertOk()
            ->assertJsonPath('data.unique_assigned_sections', 1)
            ->assertJsonPath('data.sessions_per_week', 2)
            ->assertJsonPath('data.teaching_hours_per_week', 3);
    }

    public function test_create_class_schedule_validates_day_of_week(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->create();
        $classroom = Classroom::factory()->create();

        $this->postJson('/api/v1/admin/class-schedules', [
            'class_section_id' => $classSection->id,
            'classroom_id' => $classroom->id,
            'day_of_week' => 8,
            'start_time' => '08:00',
            'end_time' => '09:00',
        ])->assertStatus(422)->assertJsonValidationErrors('day_of_week');
    }

    public function test_create_class_schedule_validates_end_after_start(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->create();
        $classroom = Classroom::factory()->create();

        $this->postJson('/api/v1/admin/class-schedules', [
            'class_section_id' => $classSection->id,
            'classroom_id' => $classroom->id,
            'day_of_week' => 1,
            'start_time' => '10:00',
            'end_time' => '09:00',
        ])->assertStatus(422)->assertJsonValidationErrors('end_time');
    }

    public function test_custom_class_schedule_cannot_overlap_a_configured_break(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->create();
        $classroom = Classroom::factory()->create();

        $this->postJson('/api/v1/admin/class-schedules', [
            'class_section_id' => $classSection->id,
            'classroom_id' => $classroom->id,
            'day_of_week' => 1,
            'start_time' => '08:55',
            'end_time' => '09:20',
        ])->assertStatus(422)->assertJsonValidationErrors('start_time');
    }

    public function test_create_class_schedule_validates_effective_dates(): void
    {
        $this->actingAsAdmin();
        $classSection = ClassSection::factory()->create();
        $classroom = Classroom::factory()->create();

        $this->postJson('/api/v1/admin/class-schedules', [
            'class_section_id' => $classSection->id,
            'classroom_id' => $classroom->id,
            'day_of_week' => 1,
            'start_time' => '08:00',
            'end_time' => '09:00',
            'effective_from' => '2026-03-01',
            'effective_until' => '2026-02-01',
        ])->assertStatus(422)->assertJsonValidationErrors('effective_until');
    }

    public function test_classroom_double_booking_is_rejected(): void
    {
        $this->actingAsAdmin();
        $classroom = Classroom::factory()->create();
        $existing = ClassSchedule::factory()->create([
            'classroom_id' => $classroom->id,
            'day_of_week' => 1,
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
        ]);

        $this->postJson('/api/v1/admin/class-schedules', [
            'class_section_id' => ClassSection::factory()->create()->id,
            'classroom_id' => $classroom->id,
            'day_of_week' => 1,
            'start_time' => '10:30',
            'end_time' => '11:30',
        ])->assertStatus(422)->assertJsonValidationErrors('classroom_id');

        $this->assertDatabaseCount('class_schedules', 1);
        $this->assertDatabaseHas('class_schedules', ['id' => $existing->id]);
    }

    public function test_back_to_back_schedule_in_same_classroom_is_allowed(): void
    {
        $this->actingAsAdmin();
        $classroom = Classroom::factory()->create();
        ClassSchedule::factory()->create([
            'classroom_id' => $classroom->id,
            'day_of_week' => 1,
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
        ]);

        $this->postJson('/api/v1/admin/class-schedules', [
            'class_section_id' => ClassSection::factory()->create()->id,
            'classroom_id' => $classroom->id,
            'day_of_week' => 1,
            'start_time' => '11:00',
            'end_time' => '12:00',
        ])->assertCreated();
    }

    public function test_teacher_double_booking_is_rejected(): void
    {
        $this->actingAsAdmin();
        $teacher = Teacher::factory()->create();
        $sectionA = ClassSection::factory()->create();
        $sectionB = ClassSection::factory()->create();
        TeacherAssignment::factory()->create([
            'class_section_id' => $sectionA->id,
            'teacher_id' => $teacher->id,
        ]);
        TeacherAssignment::factory()->create([
            'class_section_id' => $sectionB->id,
            'teacher_id' => $teacher->id,
        ]);
        ClassSchedule::factory()->create([
            'class_section_id' => $sectionA->id,
            'classroom_id' => Classroom::factory()->create()->id,
            'day_of_week' => 2,
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
        ]);

        $this->postJson('/api/v1/admin/class-schedules', [
            'class_section_id' => $sectionB->id,
            'classroom_id' => Classroom::factory()->create()->id,
            'day_of_week' => 2,
            'start_time' => '10:30',
            'end_time' => '11:30',
        ])->assertStatus(422)->assertJsonValidationErrors('class_section_id');
    }

    public function test_admin_can_show_class_schedule(): void
    {
        $this->actingAsAdmin();
        $classSchedule = ClassSchedule::factory()->create();

        $this->getJson("/api/v1/admin/class-schedules/{$classSchedule->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $classSchedule->id);
    }

    public function test_admin_can_update_class_schedule(): void
    {
        $this->actingAsAdmin();
        $classSchedule = ClassSchedule::factory()->create();

        $this->patchJson("/api/v1/admin/class-schedules/{$classSchedule->id}", [
            'day_of_week' => 3,
            'start_time' => '10:00',
            'end_time' => '11:00',
        ])->assertOk()
            ->assertJsonPath('data.day_of_week', 3)
            ->assertJsonPath('data.start_time', '10:00:00')
            ->assertJsonPath('data.end_time', '11:00:00');
    }

    public function test_admin_can_delete_class_schedule(): void
    {
        $this->actingAsAdmin();
        $classSchedule = ClassSchedule::factory()->create();

        $this->deleteJson("/api/v1/admin/class-schedules/{$classSchedule->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('class_schedules', ['id' => $classSchedule->id]);
    }

    public function test_admin_can_deactivate_a_class_schedule_without_deleting_it(): void
    {
        $this->actingAsAdmin();
        $classSchedule = ClassSchedule::factory()->create();

        $this->patchJson("/api/v1/admin/class-schedules/{$classSchedule->id}", ['status' => 'inactive'])
            ->assertOk()
            ->assertJsonPath('data.status', 'inactive');

        $this->assertDatabaseHas('class_schedules', ['id' => $classSchedule->id, 'status' => 'inactive']);
    }

    public function test_admin_can_filter_class_schedules(): void
    {
        $this->actingAsAdmin();
        $classSchedule = ClassSchedule::factory()->create(['day_of_week' => 4]);
        ClassSchedule::factory()->create(['day_of_week' => 5]);

        $this->getJson("/api/v1/admin/class-schedules?class_section_id={$classSchedule->class_section_id}&classroom_id={$classSchedule->classroom_id}&day_of_week=4")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $classSchedule->id);
    }
}
