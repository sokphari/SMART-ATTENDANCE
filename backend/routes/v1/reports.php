<?php

use App\Modules\Reports\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
     ->prefix('admin/reports')
     ->group(function (): void {
        Route::get('overview', [ReportController::class, 'overview']);
        Route::get('daily', [ReportController::class, 'daily']);
        Route::get('weekly', [ReportController::class, 'weekly']);
        Route::get('monthly', [ReportController::class, 'monthly']);
        Route::get('students/{student}', [ReportController::class, 'student']);
        Route::get('classes/{classSection}', [ReportController::class, 'classReport']);
        Route::get('exports/attendance', [ReportController::class, 'exportAttendance']);
        Route::get('exports/students/{student}', [ReportController::class, 'exportStudent']);
        Route::get('exports/classes/{classSection}', [ReportController::class, 'exportClass']);
    });

Route::middleware(['auth:sanctum', 'role:teacher', 'teacher.module:attendance_reports'])
    ->prefix('teacher/reports')
    ->group(function (): void {
        Route::get('overview', [ReportController::class, 'overview']);
        Route::get('daily', [ReportController::class, 'daily']);
        Route::get('weekly', [ReportController::class, 'weekly']);
        Route::get('monthly', [ReportController::class, 'monthly']);
        Route::get('students/{student}', [ReportController::class, 'student']);
        Route::get('classes/{classSection}', [ReportController::class, 'classReport']);
        Route::get('exports/attendance', [ReportController::class, 'exportAttendance']);
        Route::get('exports/students/{student}', [ReportController::class, 'exportStudent']);
        Route::get('exports/classes/{classSection}', [ReportController::class, 'exportClass']);
    });
