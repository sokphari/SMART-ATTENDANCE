<?php

use App\Modules\Teachers\Controllers\TeacherController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::apiResource('teachers', TeacherController::class);
    });
