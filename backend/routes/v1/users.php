<?php

use App\Modules\Users\Controllers\UserController;
use App\Modules\Users\Controllers\RolePermissionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::apiResource('users', UserController::class);
        Route::get('role-permissions', [RolePermissionController::class, 'index']);
        Route::put('role-permissions/teacher', [RolePermissionController::class, 'updateTeacher']);
    });

Route::middleware(['auth:sanctum', 'role:teacher'])
    ->get('teacher/permissions', [RolePermissionController::class, 'teacherAccess']);
