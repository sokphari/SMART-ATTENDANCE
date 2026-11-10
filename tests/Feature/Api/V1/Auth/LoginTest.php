<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    private function attemptLogin(string $email, string $password): TestResponse
    {
        return $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => $password,
        ]);
    }

    public function test_admin_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'password' => 'secret-password',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'secret-password',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.role', UserRole::Admin->value)
            ->assertJsonStructure([
                'data' => ['id', 'name', 'email', 'role', 'status'],
                'token',
            ]);

        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'password' => 'secret-password',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_login_is_blocked_after_five_failed_attempts(): void
    {
        User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'password' => 'secret-password',
        ]);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->attemptLogin('admin@example.com', 'wrong-password')
                ->assertStatus(422);
        }

        $this->attemptLogin('admin@example.com', 'wrong-password')
            ->assertStatus(429)
            ->assertHeader('Retry-After');
    }

    public function test_successful_login_clears_failed_attempts(): void
    {
        User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'password' => 'secret-password',
        ]);

        for ($attempt = 0; $attempt < 4; $attempt++) {
            $this->attemptLogin('admin@example.com', 'wrong-password')
                ->assertStatus(422);
        }

        $this->attemptLogin('admin@example.com', 'secret-password')
            ->assertOk();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->attemptLogin('admin@example.com', 'wrong-password')
                ->assertStatus(422);
        }

        $this->attemptLogin('admin@example.com', 'wrong-password')
            ->assertStatus(429);
    }

    public function test_login_block_expires_after_one_minute(): void
    {
        User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'password' => 'secret-password',
        ]);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->attemptLogin('admin@example.com', 'wrong-password')
                ->assertStatus(422);
        }

        $this->attemptLogin('admin@example.com', 'secret-password')
            ->assertStatus(429);

        $this->travel(61)->seconds();

        $this->attemptLogin('admin@example.com', 'secret-password')
            ->assertOk();
    }

    public function test_inactive_account_cannot_login(): void
    {
        User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'password' => 'secret-password',
            'status' => AccountStatus::Inactive->value,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'secret-password',
        ])->assertForbidden();
    }

    public function test_guest_cannot_access_me(): void
    {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_authenticated_user_can_access_me(): void
    {
        $user = User::factory()->admin()->create();

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_logout_revokes_current_token(): void
    {
        $user = User::factory()->admin()->create();
        $token = $user->createToken('test-device')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
