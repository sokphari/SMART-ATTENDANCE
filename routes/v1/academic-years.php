<?php

use App\Modules\AcademicYears\Controllers\AcademicYearController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::apiResource('academic-years', AcademicYearController::class);
    });
