<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AvatarApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_admin_can_upload_retrieve_and_remove_an_optimized_avatar(): void
    {
        $user = User::factory()->admin()->create();
        Sanctum::actingAs($user);

        $upload = $this->postJson('/api/v1/profile/avatar', [
            'image' => UploadedFile::fake()->image('portrait.jpg', 1200, 800),
        ])->assertOk();
        $this->assertStringContainsString('/api/v1/profile/avatar/'.$user->id, $upload->json('data.avatar_url'));

        $user->refresh();
        $this->assertNotNull($user->avatar_path);
        Storage::disk('local')->assertExists($user->avatar_path);
        $image = $this->get(parse_url($user->avatar_path ? $upload->json('data.avatar_url') : '', PHP_URL_PATH));
        $image->assertOk()->assertHeader('content-type', 'image/webp');
        $decoded = imagecreatefromstring($image->getContent());
        $this->assertLessThanOrEqual(300, imagesx($decoded));
        $this->assertLessThanOrEqual(300, imagesy($decoded));
        imagedestroy($decoded);

        $oldPath = $user->avatar_path;
        $this->deleteJson('/api/v1/profile/avatar')->assertOk()->assertJsonPath('data.avatar_url', null);
        $this->assertNull($user->fresh()->avatar_path);
        Storage::disk('local')->assertMissing($oldPath);
    }

    public function test_avatar_upload_rejects_unsupported_oversized_and_student_files(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());
        $this->postJson('/api/v1/profile/avatar', ['image' => UploadedFile::fake()->create('file.svg', 10, 'image/svg+xml')])->assertUnprocessable();
        $this->postJson('/api/v1/profile/avatar', ['image' => UploadedFile::fake()->image('large.png')->size(2049)])->assertUnprocessable();

        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Student]));
        $this->postJson('/api/v1/profile/avatar', ['image' => UploadedFile::fake()->image('student.png')])->assertForbidden();
    }

    public function test_avatar_retrieval_requires_ownership_or_admin_access(): void
    {
        $target = User::factory()->create(['role' => UserRole::Teacher]);
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Teacher]));
        $this->getJson('/api/v1/profile/avatar/'.$target->id)->assertForbidden();
        $this->postJson('/api/v1/profile/avatar', ['image' => UploadedFile::fake()->image('portrait.png')])->assertOk();
    }
}
