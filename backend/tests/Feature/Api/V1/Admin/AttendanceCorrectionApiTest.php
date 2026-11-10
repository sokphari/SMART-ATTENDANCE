<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\AttendanceCorrectionStatus;
use App\Enums\AttendanceStatus;
use App\Enums\VerificationMethod;
use App\Models\Attendance;
use App\Models\AttendanceCorrection;
use App\Models\AuditLog;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceCorrectionApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAdmin(): User
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_guest_cannot_list_corrections(): void
    {
        $this->getJson('/api/v1/admin/attendance-corrections')->assertUnauthorized();
    }

    public function test_non_admin_cannot_create_correction(): void
    {
        Sanctum::actingAs(Teacher::factory()->create()->user);

        $this->postJson('/api/v1/admin/attendance-corrections')
            ->assertForbidden();
    }

    public function test_admin_can_create_correction_request_with_audit_log(): void
    {
        $admin = $this->actingAdmin();
        $attendance = Attendance::factory()->create(['status' => AttendanceStatus::Absent]);

        $response = $this->postJson('/api/v1/admin/attendance-corrections', [
            'attendance_id' => $attendance->id,
            'requested_status' => AttendanceStatus::Excused->value,
            'reason' => 'Student provided a medical certificate.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.attendance_id', $attendance->id)
            ->assertJsonPath('data.requested_by', $admin->id)
            ->assertJsonPath('data.requested_status', AttendanceStatus::Excused->value)
            ->assertJsonPath('data.status', AttendanceCorrectionStatus::Pending->value);

        $correctionId = $response->json('data.id');

        $this->assertDatabaseHas('attendance_corrections', [
            'id' => $correctionId,
            'attendance_id' => $attendance->id,
            'requested_by' => $admin->id,
            'requested_status' => AttendanceStatus::Excused->value,
            'status' => AttendanceCorrectionStatus::Pending->value,
        ]);

        $log = AuditLog::query()->where('action', 'attendance_correction.requested')->firstOrFail();

        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame('attendance_correction', $log->entity_type);
        $this->assertSame($correctionId, $log->entity_id);
        $this->assertSame(['attendance_status' => AttendanceStatus::Absent->value], $log->old_values);
        $this->assertSame(AttendanceStatus::Excused->value, $log->new_values['requested_status']);
    }

    public function test_cannot_create_duplicate_pending_correction(): void
    {
        $this->actingAdmin();
        $attendance = Attendance::factory()->create(['status' => AttendanceStatus::Absent]);

        $payload = [
            'attendance_id' => $attendance->id,
            'requested_status' => AttendanceStatus::Excused->value,
            'reason' => 'Medical certificate.',
        ];

        $this->postJson('/api/v1/admin/attendance-corrections', $payload)->assertCreated();

        $this->postJson('/api/v1/admin/attendance-corrections', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('attendance_id');
    }

    public function test_admin_can_filter_corrections(): void
    {
        $this->actingAdmin();
        AttendanceCorrection::factory()->create(['status' => AttendanceCorrectionStatus::Pending]);
        AttendanceCorrection::factory()->approved()->create();

        $this->getJson('/api/v1/admin/attendance-corrections?status=approved')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', AttendanceCorrectionStatus::Approved->value);
    }

    public function test_admin_can_show_correction(): void
    {
        $this->actingAdmin();
        $correction = AttendanceCorrection::factory()->create();

        $this->getJson("/api/v1/admin/attendance-corrections/{$correction->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $correction->id);
    }

    public function test_admin_can_approve_correction_and_update_attendance(): void
    {
        $admin = $this->actingAdmin();
        $attendance = Attendance::factory()->create([
            'status' => AttendanceStatus::Absent,
            'verification_method' => VerificationMethod::System,
        ]);
        $correction = AttendanceCorrection::factory()->create([
            'attendance_id' => $attendance->id,
            'requested_by' => $admin->id,
            'requested_status' => AttendanceStatus::Excused,
        ]);

        $this->postJson("/api/v1/admin/attendance-corrections/{$correction->id}/review", [
            'status' => AttendanceCorrectionStatus::Approved->value,
            'review_note' => 'Certificate verified.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', AttendanceCorrectionStatus::Approved->value)
            ->assertJsonPath('data.reviewed_by', $admin->id)
            ->assertJsonPath('data.review_note', 'Certificate verified.');

        $this->assertDatabaseHas('attendance_corrections', [
            'id' => $correction->id,
            'status' => AttendanceCorrectionStatus::Approved->value,
            'reviewed_by' => $admin->id,
        ]);
        $this->assertDatabaseHas('attendances', [
            'id' => $attendance->id,
            'status' => AttendanceStatus::Excused->value,
            'verification_method' => VerificationMethod::Manual->value,
            'marked_by' => $admin->id,
        ]);

        $log = AuditLog::query()->where('action', 'attendance_correction.approved')->firstOrFail();

        $this->assertSame(AttendanceStatus::Absent->value, $log->old_values['attendance_status']);
        $this->assertSame(AttendanceStatus::Excused->value, $log->new_values['attendance_status']);
    }

    public function test_admin_can_reject_correction_without_changing_attendance(): void
    {
        $admin = $this->actingAdmin();
        $attendance = Attendance::factory()->create(['status' => AttendanceStatus::Absent]);
        $correction = AttendanceCorrection::factory()->create([
            'attendance_id' => $attendance->id,
            'requested_by' => $admin->id,
            'requested_status' => AttendanceStatus::Excused,
        ]);

        $this->postJson("/api/v1/admin/attendance-corrections/{$correction->id}/review", [
            'status' => AttendanceCorrectionStatus::Rejected->value,
            'review_note' => 'Insufficient evidence.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', AttendanceCorrectionStatus::Rejected->value);

        $this->assertDatabaseHas('attendances', [
            'id' => $attendance->id,
            'status' => AttendanceStatus::Absent->value,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'attendance_correction.rejected',
            'entity_type' => 'attendance_correction',
            'entity_id' => $correction->id,
        ]);
    }

    public function test_cannot_review_already_reviewed_correction(): void
    {
        $this->actingAdmin();
        $correction = AttendanceCorrection::factory()->approved()->create();

        $this->postJson("/api/v1/admin/attendance-corrections/{$correction->id}/review", [
            'status' => AttendanceCorrectionStatus::Approved->value,
        ])->assertStatus(409);
    }

    public function test_review_validates_decision(): void
    {
        $this->actingAdmin();
        $correction = AttendanceCorrection::factory()->create();

        $this->postJson("/api/v1/admin/attendance-corrections/{$correction->id}/review", [
            'status' => AttendanceCorrectionStatus::Pending->value,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    public function test_store_validates_fields(): void
    {
        $this->actingAdmin();

        $this->postJson('/api/v1/admin/attendance-corrections', [
            'attendance_id' => 999999,
            'requested_status' => 'unknown',
            'reason' => '',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['attendance_id', 'requested_status', 'reason']);
    }
}
