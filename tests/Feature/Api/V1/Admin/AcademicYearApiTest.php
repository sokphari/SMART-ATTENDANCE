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

class AcademicYearApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_guest_cannot_list_academic_years(): void
    {
        $this->getJson('/api/v1/admin/academic-years')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_academic_years(): void
    {
        $student = User::factory()->create([
            'role' => UserRole::Student->value,
        ]);

        Sanctum::actingAs($student);

        $this->getJson('/api/v1/admin/academic-years')->assertForbidden();
    }

    public function test_admin_can_list_academic_years(): void
    {
        $this->actingAsAdmin();
        AcademicYear::factory()->count(3)->create();

        $this->getJson('/api/v1/admin/academic-years')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'name', 'start_date', 'end_date', 'status', 'semesters_count']],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_create_academic_year(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/academic-years', [
            'name' => '2025-2026',
            'start_date' => '2025-10-01',
            'end_date' => '2026-07-31',
            'status' => AcademicPeriodStatus::Upcoming->value,
        ])->assertCreated()
            ->assertJsonPath('data.name', '2025-2026')
            ->assertJsonPath('data.start_date', '2025-10-01')
            ->assertJsonPath('data.status', AcademicPeriodStatus::Upcoming->value);

        $this->assertDatabaseHas('academic_years', ['name' => '2025-2026']);
    }

    public function test_create_academic_year_validates_end_before_start(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/v1/admin/academic-years', [
            'name' => '2025-2026',
            'start_date' => '2026-01-01',
            'end_date' => '2025-01-01',
        ])->assertStatus(422)->assertJsonValidationErrors('end_date');
    }

    public function test_create_academic_year_validates_duplicate_name(): void
    {
        $this->actingAsAdmin();
        AcademicYear::factory()->create(['name' => '2025-2026']);

        $this->postJson('/api/v1/admin/academic-years', [
            'name' => '2025-2026',
            'start_date' => '2025-10-01',
            'end_date' => '2026-07-31',
        ])->assertStatus(422)->assertJsonValidationErrors('name');
    }

    public function test_admin_can_show_academic_year(): void
    {
        $this->actingAsAdmin();
        $academicYear = AcademicYear::factory()->create();

        $this->getJson("/api/v1/admin/academic-years/{$academicYear->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $academicYear->id);
    }

    public function test_admin_can_update_academic_year(): void
    {
        $this->actingAsAdmin();
        $academicYear = AcademicYear::factory()->create([
            'name' => '2025-2026',
            'start_date' => '2025-01-01',
            'end_date' => '2025-12-31',
        ]);

        $this->patchJson("/api/v1/admin/academic-years/{$academicYear->id}", [
            'name' => '2025-2027',
            'end_date' => '2026-12-31',
            'status' => AcademicPeriodStatus::Completed->value,
        ])->assertOk()
            ->assertJsonPath('data.name', '2025-2027')
            ->assertJsonPath('data.end_date', '2026-12-31')
            ->assertJsonPath('data.status', AcademicPeriodStatus::Completed->value);
    }

    public function test_admin_can_delete_academic_year_without_semesters(): void
    {
        $this->actingAsAdmin();
        $academicYear = AcademicYear::factory()->create();

        $this->deleteJson("/api/v1/admin/academic-years/{$academicYear->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('academic_years', ['id' => $academicYear->id]);
    }

    public function test_admin_cannot_delete_academic_year_with_semesters(): void
    {
        $this->actingAsAdmin();
        $academicYear = AcademicYear::factory()->create();
        Semester::factory()->create(['academic_year_id' => $academicYear->id]);

        $this->deleteJson("/api/v1/admin/academic-years/{$academicYear->id}")
            ->assertStatus(409);
    }
}
