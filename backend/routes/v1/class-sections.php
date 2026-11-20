<?php

use App\Modules\ClassSections\Controllers\ClassSectionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::get('class-sections/{classSection}/eligible-students', [ClassSectionController::class, 'eligibleStudents']);
        Route::apiResource('class-sections', ClassSectionController::class);
    });
