<?php

use App\Modules\Teachers\Controllers\TeacherDashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:teacher'])
    ->prefix('teacher')
    ->group(function (): void {
        Route::get('dashboard', TeacherDashboardController::class);
    });
