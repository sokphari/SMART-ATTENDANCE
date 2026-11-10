<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        return $admin;
    }

    public function test_guest_cannot_list_users(): void
    {
        $this->getJson('/api/v1/admin/users')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_users(): void
    {
        $student = User::factory()->create([
            'role' => UserRole::Student->value,
            'status' => AccountStatus::Active->value,
        ]);

        Sanctum::actingAs($student);

        $this->getJson('/api/v1/admin/users')->assertForbidden();
    }

    public function test_admin_can_list_users(): void
    {
        $this->actingAsAdmin();
        User::factory()->count(3)->create();

        $this->getJson('/api/v1/admin/users')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'name', 'email', 'role', 'status']],
                'links',
                'meta',
            ]);
    }

    public function test_admin_can_create_user(): void
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/v1/admin/users', [
            'name' => 'Jane Teacher',
            'email' => 'jane@example.com',
            'password' => 'secret-password',
            'role' => UserRole::Teacher->value,
            'status' => AccountStatus::Active->value,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.email', 'jane@example.com')
            ->assertJsonPath('data.role', UserRole::Teacher->value)
            ->assertJsonMissingPath('data.password');

        $this->assertDatabaseHas('users', [
            'email' => 'jane@example.com',
            'role' => UserRole::Teacher->value,
        ]);
    }

    public function test_create_user_validates_duplicate_email(): void
    {
        $this->actingAsAdmin();
        User::factory()->create(['email' => 'jane@example.com']);

        $this->postJson('/api/v1/admin/users', [
            'name' => 'Jane Teacher',
            'email' => 'jane@example.com',
            'password' => 'secret-password',
            'role' => UserRole::Teacher->value,
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_admin_can_show_user(): void
    {
        $this->actingAsAdmin();
        $user = User::factory()->create();

        $this->getJson("/api/v1/admin/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);
    }

    public function test_admin_can_update_user(): void
    {
        $this->actingAsAdmin();
        $user = User::factory()->create();

        $this->patchJson("/api/v1/admin/users/{$user->id}", [
            'name' => 'Updated Name',
            'role' => UserRole::Teacher->value,
            'status' => AccountStatus::Suspended->value,
        ])->assertOk()
            ->assertJsonPath('data.name', 'Updated Name')
            ->assertJsonPath('data.role', UserRole::Teacher->value)
            ->assertJsonPath('data.status', AccountStatus::Suspended->value);
    }

    public function test_admin_cannot_deactivate_self(): void
    {
        $admin = $this->actingAsAdmin();

        $this->deleteJson("/api/v1/admin/users/{$admin->id}")->assertForbidden();
    }

    public function test_admin_can_deactivate_another_user(): void
    {
        $this->actingAsAdmin();
        $user = User::factory()->create();

        $this->deleteJson("/api/v1/admin/users/{$user->id}")->assertNoContent();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'status' => AccountStatus::Inactive->value,
        ]);
    }
}
