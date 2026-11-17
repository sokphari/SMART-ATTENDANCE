<?php

use App\Modules\Attendance\Controllers\TeacherAttendanceHistoryController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:teacher', 'teacher.module:attendance_history'])
    ->prefix('teacher')
    ->group(function (): void {
        Route::get('attendance', [TeacherAttendanceHistoryController::class, 'index']);
    });

Route::middleware(['auth:sanctum', 'role:teacher', 'teacher.module:attendance_reports'])
    ->prefix('teacher')
    ->group(function (): void {
        Route::get('reports/attendance', [TeacherAttendanceHistoryController::class, 'report']);
    });
