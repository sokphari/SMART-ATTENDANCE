<?php

namespace Tests\Feature\Api\V1\Admin;

use App\Models\RoleModulePermission;
use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RolePermissionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_admin_can_read_and_update_teacher_role_permissions(): void
    {
        $this->getJson('/api/v1/admin/role-permissions')->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Teacher]));
        $this->getJson('/api/v1/admin/role-permissions')->assertForbidden();
        $this->putJson('/api/v1/admin/role-permissions/teacher', ['permissions' => ['classes' => false]])->assertForbidden();

        Sanctum::actingAs(User::factory()->admin()->create());
        $this->getJson('/api/v1/admin/role-permissions')->assertOk()->assertJsonCount(7, 'data.teacher');
        $this->putJson('/api/v1/admin/role-permissions/teacher', [
            'permissions' => ['classes' => false, 'attendance_sessions' => true],
        ])->assertOk()->assertJsonPath('data.teacher.1.enabled', false);

        $this->assertDatabaseHas('role_module_permissions', ['role' => 'teacher', 'module' => 'classes', 'enabled' => false]);
    }

    public function test_disabled_teacher_module_is_blocked_on_its_api_route(): void
    {
        RoleModulePermission::query()->updateOrCreate(
            ['role' => 'teacher', 'module' => 'classes'],
            ['enabled' => false],
        );
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Teacher]));

        $this->getJson('/api/v1/teacher/class-sections')->assertForbidden()
            ->assertJsonPath('message', 'Access to this teacher module is disabled by an administrator.');
    }

    public function test_student_cannot_open_admin_permission_routes(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Student]));
        $this->getJson('/api/v1/admin/role-permissions')->assertForbidden();
    }
}
