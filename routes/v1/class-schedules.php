<?php

use App\Modules\ClassSchedules\Controllers\ClassScheduleController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::apiResource('class-schedules', ClassScheduleController::class);
    });
