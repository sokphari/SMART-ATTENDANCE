<?php

use App\Modules\Attendance\Controllers\StudentCheckInController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:student'])
    ->prefix('student')
    ->group(function (): void {
        Route::post('attendance/check-in', [StudentCheckInController::class, 'store']);
    });
