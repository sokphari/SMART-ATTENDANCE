<?php

use App\Modules\Enrollments\Controllers\EnrollmentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::post('enrollments/{enrollment}/transfer', [EnrollmentController::class, 'transfer']);
        Route::apiResource('enrollments', EnrollmentController::class);
    });
