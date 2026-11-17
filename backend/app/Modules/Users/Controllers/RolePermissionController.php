<?php

namespace App\Modules\Users\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\RoleModulePermission;
use App\Modules\Users\RoleModuleCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RolePermissionController extends Controller
{
    public function index(): JsonResponse
    {
        $stored = RoleModulePermission::query()
            ->where('role', 'teacher')
            ->pluck('enabled', 'module');

        $modules = [];
        foreach (RoleModuleCatalog::TEACHER_MODULES as $key => $label) {
            $modules[] = [
                'key' => $key,
                'label' => $label,
                'enabled' => (bool) ($stored[$key] ?? true),
            ];
        }

        return response()->json(['data' => ['teacher' => $modules]]);
    }

    public function updateTeacher(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['required', 'boolean'],
        ]);

        $unknown = array_diff(array_keys($validated['permissions']), array_keys(RoleModuleCatalog::TEACHER_MODULES));
        if ($unknown !== []) {
            throw ValidationException::withMessages([
                'permissions' => ['One or more permission keys are not supported.'],
            ]);
        }

        $oldValues = RoleModulePermission::query()
            ->where('role', 'teacher')
            ->pluck('enabled', 'module')
            ->all();

        DB::transaction(function () use ($validated): void {
            foreach ($validated['permissions'] as $module => $enabled) {
                RoleModulePermission::query()->updateOrCreate(
                    ['role' => 'teacher', 'module' => $module],
                    ['enabled' => $enabled],
                );
            }
        });

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'role_permissions.teacher_updated',
            'entity_type' => 'role',
            'entity_id' => null,
            'old_values' => $oldValues,
            'new_values' => $validated['permissions'],
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        return $this->index();
    }

    public function teacherAccess(): JsonResponse
    {
        $stored = RoleModulePermission::query()
            ->where('role', 'teacher')
            ->pluck('enabled', 'module');

        $permissions = [];
        foreach (RoleModuleCatalog::TEACHER_MODULES as $key => $_label) {
            $permissions[$key] = (bool) ($stored[$key] ?? true);
        }

        return response()->json(['data' => $permissions]);
    }
}
