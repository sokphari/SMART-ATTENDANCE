<?php

namespace Tests\Feature\Api\V1;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_list_notifications(): void
    {
        $this->getJson('/api/v1/notifications')
            ->assertUnauthorized();
    }

    public function test_authenticated_user_can_list_notifications(): void
    {
        $user = User::factory()->admin()->create();
        Sanctum::actingAs($user);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'auth.login_success',
            'entity_type' => User::class,
            'entity_id' => $user->id,
            'new_values' => ['name' => $user->name, 'email' => $user->email, 'role' => 'admin'],
            'ip_address' => '127.0.0.1',
            'created_at' => now(),
        ]);

        AuditLog::create([
            'user_id' => null,
            'action' => 'auth.login_failed',
            'entity_type' => User::class,
            'entity_id' => null,
            'old_values' => ['email' => 'hacker@example.com'],
            'new_values' => ['reason' => 'Invalid credentials'],
            'ip_address' => '192.168.1.100',
            'created_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/notifications');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'action',
                        'category',
                        'level',
                        'title',
                        'message',
                        'ip_address',
                        'created_at',
                        'metadata',
                    ],
                ],
                'meta' => [
                    'total',
                    'unread_count',
                    'last_updated',
                ],
            ]);

        $data = $response->json('data');
        $this->assertSame([
            'id',
            'action',
            'category',
            'level',
            'title',
            'message',
            'ip_address',
            'created_at',
            'metadata',
        ], array_keys($data[0]));
        $this->assertArrayNotHasKey('user', $data[0]);
        $this->assertArrayNotHasKey('raw_id', $data[0]);
        $this->assertCount(2, $data);
        $this->assertEquals('error', $data[0]['level']);
        $this->assertEquals('Login Failed Attempt', $data[0]['title']);
        $this->assertEquals('success', $data[1]['level']);
    }

    public function test_notification_limit_is_clamped_and_response_is_cached(): void
    {
        $user = User::factory()->admin()->create();
        Sanctum::actingAs($user);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'system.updated',
            'entity_type' => User::class,
            'entity_id' => $user->id,
            'created_at' => now(),
        ]);

        $first = $this->getJson('/api/v1/notifications?limit=10');
        $first->assertOk()->assertJsonPath('meta.total', 1);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'system.updated_again',
            'entity_type' => User::class,
            'entity_id' => $user->id,
            'created_at' => now(),
        ]);

        $second = $this->getJson('/api/v1/notifications?limit=10');
        $second->assertOk()->assertJsonPath('meta.total', 1);

        Cache::flush();

        $fresh = $this->getJson('/api/v1/notifications?limit=10');
        $fresh->assertOk()->assertJsonPath('meta.total', 2);
    }
}
