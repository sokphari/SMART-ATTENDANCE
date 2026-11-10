<?php

use App\Modules\Enrollments\Controllers\EnrollmentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::apiResource('enrollments', EnrollmentController::class);
    });
