<?php

namespace App\Modules\Shared\Middleware;

use App\Models\RoleModulePermission;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTeacherModuleEnabled
{
    public function handle(Request $request, Closure $next, string $module): Response
    {
        $enabled = RoleModulePermission::query()
            ->where('role', 'teacher')
            ->where('module', $module)
            ->value('enabled');

        if ($enabled === false || $enabled === 0 || $enabled === '0') {
            return response()->json([
                'message' => 'Access to this teacher module is disabled by an administrator.',
            ], 403);
        }

        return $next($request);
    }
}
