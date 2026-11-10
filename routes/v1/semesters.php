<?php

use App\Modules\Semesters\Controllers\SemesterController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::apiResource('semesters', SemesterController::class);
    });
