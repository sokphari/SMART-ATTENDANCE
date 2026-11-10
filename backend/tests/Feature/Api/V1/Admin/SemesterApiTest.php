<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\AcademicPeriodStatus;
use App\Enums\UserRole;
use App\Models\AcademicYear;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SemesterApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        return $admin;
    }

    private function createYear(
        string $name = '2025-2026',
        string $startDate = '2025-01-01',
        string $endDate = '2025-12-31'
    ): AcademicYear {
        return AcademicYear::factory()->create([
            'name' => $name,
            'start_date' => $startDate,
            'end_date' => $endDate,
        ]);
    }

    public function test_guest_cannot_list_semesters(): void
    {
        $this->getJson('/api/v1/admin/semesters')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_semesters(): void
    {
        $student = User::factory()->create([
            'role' => UserRole::Student->value,
        ]);

        Sanctum::actingAs($student);

        $this->getJson('/api/v1/admin/semesters')->assertForbidden();
    }

    public function test_admin_can_list_semesters(): void
    {
        $this->actingAsAdmin();
        Semester::factory()->create();

        $this->getJson('/api/v1/admin/semesters')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id',
                    'academic_year_id',
                    'academic_year' => ['id', 'name'],
                    'name',
                    'start_date',
                    'end_date',
                    'status',
                ]],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_create_semester(): void
    {
        $this->actingAsAdmin();
        $year = $this->createYear();

        $this->postJson('/api/v1/admin/semesters', [
            'academic_year_id' => $year->id,
            'name' => 'Semester 1',
            'start_date' => '2025-02-01',
            'end_date' => '2025-06-30',
            'status' => AcademicPeriodStatus::Upcoming->value,
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Semester 1')
            ->assertJsonPath('data.academic_year_id', $year->id)
            ->assertJsonPath('data.academic_year.id', $year->id)
            ->assertJsonPath('data.status', AcademicPeriodStatus::Upcoming->value);

        $this->assertDatabaseHas('semesters', [
            'academic_year_id' => $year->id,
            'name' => 'Semester 1',
        ]);
    }

    public function test_create_semester_validates_duplicate_name_within_year(): void
    {
        $this->actingAsAdmin();
        $year = $this->createYear();
        Semester::factory()->create([
            'academic_year_id' => $year->id,
            'name' => 'Semester 1',
        ]);

        $this->postJson('/api/v1/admin/semesters', [
            'academic_year_id' => $year->id,
            'name' => 'Semester 1',
            'start_date' => '2025-02-01',
            'end_date' => '2025-06-30',
        ])->assertStatus(422)->assertJsonValidationErrors('name');
    }

    public function test_create_semester_allows_same_name_in_different_year(): void
    {
        $this->actingAsAdmin();
        $firstYear = $this->createYear();
        $secondYear = $this->createYear('2026-2027', '2026-01-01', '2026-12-31');
        Semester::factory()->create([
            'academic_year_id' => $firstYear->id,
            'name' => 'Semester 1',
        ]);

        $this->postJson('/api/v1/admin/semesters', [
            'academic_year_id' => $secondYear->id,
            'name' => 'Semester 1',
            'start_date' => '2026-02-01',
            'end_date' => '2026-06-30',
        ])->assertCreated();
    }

    public function test_create_semester_validates_dates_within_academic_year(): void
    {
        $this->actingAsAdmin();
        $year = $this->createYear();

        $this->postJson('/api/v1/admin/semesters', [
            'academic_year_id' => $year->id,
            'name' => 'Semester 1',
            'start_date' => '2024-12-01',
            'end_date' => '2025-06-30',
        ])->assertStatus(422)->assertJsonValidationErrors('start_date');
    }

    public function test_create_semester_validates_end_before_start(): void
    {
        $this->actingAsAdmin();
        $year = $this->createYear();

        $this->postJson('/api/v1/admin/semesters', [
            'academic_year_id' => $year->id,
            'name' => 'Semester 1',
            'start_date' => '2025-06-30',
            'end_date' => '2025-02-01',
        ])->assertStatus(422)->assertJsonValidationErrors('end_date');
    }

    public function test_admin_can_show_semester(): void
    {
        $this->actingAsAdmin();
        $semester = Semester::factory()->create();

        $this->getJson("/api/v1/admin/semesters/{$semester->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $semester->id);
    }

    public function test_admin_can_update_semester(): void
    {
        $this->actingAsAdmin();
        $year = $this->createYear();
        $semester = Semester::factory()->create([
            'academic_year_id' => $year->id,
            'name' => 'Semester 1',
            'start_date' => '2025-02-01',
            'end_date' => '2025-06-30',
        ]);

        $this->patchJson("/api/v1/admin/semesters/{$semester->id}", [
            'name' => 'First Semester',
            'status' => AcademicPeriodStatus::Active->value,
        ])->assertOk()
            ->assertJsonPath('data.name', 'First Semester')
            ->assertJsonPath('data.status', AcademicPeriodStatus::Active->value);
    }

    public function test_admin_can_delete_semester(): void
    {
        $this->actingAsAdmin();
        $semester = Semester::factory()->create();

        $this->deleteJson("/api/v1/admin/semesters/{$semester->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('semesters', ['id' => $semester->id]);
    }
}
