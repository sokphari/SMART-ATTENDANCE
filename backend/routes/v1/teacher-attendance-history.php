<?php

use App\Modules\Attendance\Controllers\TeacherAttendanceHistoryController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:teacher'])
    ->prefix('teacher')
    ->group(function (): void {
        Route::get('attendance', [TeacherAttendanceHistoryController::class, 'index']);
        Route::get('reports/attendance', [TeacherAttendanceHistoryController::class, 'report']);
    });
