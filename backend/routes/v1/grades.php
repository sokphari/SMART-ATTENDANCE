<?php

use App\Modules\Grades\Controllers\GradeController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function (): void {
    Route::get('gradebook/sections', [GradeController::class, 'sections']);
    Route::get('gradebook/{classSection}', [GradeController::class, 'gradebook']);
    Route::patch('gradebook/{classSection}/{student}', [GradeController::class, 'saveGrade']);
    Route::get('semesters/{semester}/grade-policy', [GradeController::class, 'policy']);
    Route::put('semesters/{semester}/grade-policy', [GradeController::class, 'updatePolicy']);
    Route::get('semester-results', [GradeController::class, 'results']);
    Route::post('semester-results/{classSection}/approve', [GradeController::class, 'approve']);
    Route::post('semester-results/{classSection}/publish', [GradeController::class, 'publish']);
    Route::get('semester-results/{classSection}/pdf', [GradeController::class, 'pdf']);
});

Route::middleware(['auth:sanctum', 'role:teacher', 'teacher.module:grades'])->prefix('teacher')->group(function (): void {
    Route::get('gradebook/sections', [GradeController::class, 'sections']);
    Route::get('gradebook/{classSection}', [GradeController::class, 'gradebook']);
    Route::patch('gradebook/{classSection}/{student}', [GradeController::class, 'saveGrade']);
});

Route::middleware(['auth:sanctum', 'role:student'])->prefix('student')->group(function (): void {
    Route::get('semester-results', [GradeController::class, 'results']);
    Route::get('semester-results/{classSection}/pdf', [GradeController::class, 'pdf']);
});
