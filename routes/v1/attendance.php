<?php

use App\Modules\Attendance\Controllers\AttendanceController;
use App\Modules\Attendance\Controllers\AttendanceCorrectionController;
use App\Modules\Attendance\Controllers\AttendanceReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::get('attendance', [AttendanceController::class, 'index']);
        Route::get('reports/attendance', [AttendanceReportController::class, 'index']);

        Route::get('attendance-corrections', [AttendanceCorrectionController::class, 'index']);
        Route::post('attendance-corrections', [AttendanceCorrectionController::class, 'store']);
        Route::get('attendance-corrections/{attendanceCorrection}', [AttendanceCorrectionController::class, 'show']);
        Route::post('attendance-corrections/{attendanceCorrection}/review', [AttendanceCorrectionController::class, 'review']);
    });
