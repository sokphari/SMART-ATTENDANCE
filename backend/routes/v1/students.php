<?php

use App\Modules\Students\Controllers\StudentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::apiResource('students', StudentController::class);
    });
