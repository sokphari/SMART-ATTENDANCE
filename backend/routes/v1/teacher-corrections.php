<?php

use App\Modules\Attendance\Controllers\TeacherAttendanceCorrectionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:teacher'])
    ->prefix('teacher/attendance-corrections')
    ->group(function (): void {
        Route::get('/', [TeacherAttendanceCorrectionController::class, 'index']);
        Route::post('/', [TeacherAttendanceCorrectionController::class, 'store']);
    });
