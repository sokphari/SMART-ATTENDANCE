<?php

use App\Modules\TeacherAssignments\Controllers\TeacherAssignmentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::apiResource('teacher-assignments', TeacherAssignmentController::class);
    });
