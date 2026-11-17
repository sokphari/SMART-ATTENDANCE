<?php

use App\Modules\Teachers\Controllers\TeacherClassSectionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:teacher', 'teacher.module:classes'])
    ->prefix('teacher/class-sections')
    ->group(function (): void {
        Route::get('/', [TeacherClassSectionController::class, 'index']);
        Route::get('/{classSection}', [TeacherClassSectionController::class, 'show']);
        Route::get('/{classSection}/students', [TeacherClassSectionController::class, 'students']);
        Route::get('/{classSection}/schedules', [TeacherClassSectionController::class, 'schedules']);
    });
