<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\AuditLog;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuditLogApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_list_audit_logs(): void
    {
        $this->getJson('/api/v1/admin/audit-logs')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_audit_logs(): void
    {
        Sanctum::actingAs(Teacher::factory()->create()->user);

        $this->getJson('/api/v1/admin/audit-logs')->assertForbidden();
    }

    public function test_admin_can_list_audit_logs(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        AuditLog::factory()->create([
            'user_id' => $admin->id,
            'action' => 'attendance_correction.approved',
            'entity_type' => 'attendance_correction',
            'entity_id' => 10,
            'old_values' => ['status' => 'absent'],
            'new_values' => ['status' => 'excused'],
        ]);
        AuditLog::factory()->create();

        $this->getJson('/api/v1/admin/audit-logs')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure([
                'data' => [[
                    'id',
                    'user_id',
                    'user',
                    'action',
                    'entity_type',
                    'entity_id',
                    'old_values',
                    'new_values',
                    'ip_address',
                    'created_at',
                ]],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_filter_audit_logs(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $target = AuditLog::factory()->create([
            'action' => 'attendance_correction.approved',
            'entity_type' => 'attendance_correction',
            'entity_id' => 42,
        ]);
        AuditLog::factory()->create([
            'action' => 'attendance_correction.rejected',
            'entity_type' => 'attendance_correction',
            'entity_id' => 43,
        ]);

        $this->getJson('/api/v1/admin/audit-logs?action=attendance_correction.approved')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $target->id);

        $this->getJson('/api/v1/admin/audit-logs?entity_type=attendance_correction&entity_id=42')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $target->id);

        $this->getJson('/api/v1/admin/audit-logs?user_id='.$target->user_id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $target->id);
    }
}
