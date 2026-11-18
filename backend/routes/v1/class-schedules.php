<?php

use App\Modules\ClassSchedules\Controllers\ClassScheduleController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::get('class-schedules/summary', [ClassScheduleController::class, 'summary']);
        Route::get('class-schedules/configuration', [ClassScheduleController::class, 'configuration']);
        Route::patch('class-schedules/time-slots/{timeSlot}', [ClassScheduleController::class, 'updateTimeSlot']);
        Route::patch('class-schedules/settings', [ClassScheduleController::class, 'updateSettings']);
        Route::get('teachers/{teacher}/workload', [ClassScheduleController::class, 'teacherWorkload']);
        Route::apiResource('class-schedules', ClassScheduleController::class);
    });
