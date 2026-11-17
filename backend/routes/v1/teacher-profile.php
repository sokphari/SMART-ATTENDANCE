<?php

use App\Modules\Teachers\Controllers\TeacherProfileController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:teacher', 'teacher.module:profile'])
    ->prefix('teacher/profile')
    ->group(function (): void {
        Route::get('/', [TeacherProfileController::class, 'show']);
        Route::patch('/', [TeacherProfileController::class, 'update']);
    });
