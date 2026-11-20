<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\AttendanceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttendanceQrApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_and_teacher_cannot_use_admin_qr_routes(): void
    {
        $session = AttendanceSession::factory()->create();

        $this->getJson('/api/v1/admin/attendance/qr-sessions')->assertUnauthorized();
        $this->postJson("/api/v1/admin/attendance/qr-sessions/{$session->id}/qr-token")->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/v1/admin/attendance/qr-sessions')->assertForbidden();
        $this->postJson("/api/v1/admin/attendance/qr-sessions/{$session->id}/qr-token")->assertForbidden();
    }

    public function test_admin_sees_only_sessions_currently_eligible_for_qr(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $active = AttendanceSession::factory()->create([
            'status' => 'open',
            'starts_at' => now()->subMinutes(5),
            'late_after' => now()->addMinutes(10),
            'closes_at' => now()->addHour(),
        ]);
        AttendanceSession::factory()->closed()->create();
        AttendanceSession::factory()->create([
            'status' => 'open',
            'starts_at' => now()->addHour(),
            'late_after' => now()->addHours(2),
            'closes_at' => now()->addHours(3),
        ]);

        $this->getJson('/api/v1/admin/attendance/qr-sessions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $active->id);
    }

    public function test_admin_can_generate_qr_for_existing_active_session(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());
        $session = AttendanceSession::factory()->create([
            'status' => 'open',
            'starts_at' => now()->subMinutes(5),
            'late_after' => now()->addMinutes(10),
            'closes_at' => now()->addHour(),
        ]);

        $token = $this->postJson("/api/v1/admin/attendance/qr-sessions/{$session->id}/qr-token")
            ->assertCreated()
            ->assertJsonStructure(['data' => ['token', 'expires_at']])
            ->json('data.token');

        $this->assertDatabaseHas('attendance_qr_tokens', [
            'attendance_session_id' => $session->id,
            'token_hash' => hash('sha256', $token),
            'revoked_at' => null,
        ]);
    }

    public function test_admin_cannot_issue_qr_outside_session_window(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());
        $session = AttendanceSession::factory()->create([
            'status' => 'open',
            'starts_at' => now()->addHour(),
            'late_after' => now()->addHours(2),
            'closes_at' => now()->addHours(3),
        ]);

        $this->postJson("/api/v1/admin/attendance/qr-sessions/{$session->id}/qr-token")
            ->assertStatus(409);
        $this->assertDatabaseCount('attendance_qr_tokens', 0);
    }
}
