<?php

use App\Modules\Attendance\Controllers\TeacherAttendanceSessionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:teacher', 'teacher.module:attendance_sessions'])
    ->prefix('teacher')
    ->group(function (): void {
        Route::get('attendance-sessions', [TeacherAttendanceSessionController::class, 'index']);
        Route::post('attendance-sessions', [TeacherAttendanceSessionController::class, 'store']);
        Route::get('attendance-sessions/{attendanceSession}/attendance', [TeacherAttendanceSessionController::class, 'attendance']);
        Route::post('attendance-sessions/{attendanceSession}/attendance/manual', [TeacherAttendanceSessionController::class, 'manualAttendance']);
        Route::get('attendance-sessions/{attendanceSession}', [TeacherAttendanceSessionController::class, 'show']);
        Route::post('attendance-sessions/{attendanceSession}/local-qr-test', [TeacherAttendanceSessionController::class, 'startLocalQrTest']);
        Route::post('attendance-sessions/{attendanceSession}/qr-token', [TeacherAttendanceSessionController::class, 'qrToken']);
        Route::post('attendance-sessions/{attendanceSession}/close', [TeacherAttendanceSessionController::class, 'close']);
    });
