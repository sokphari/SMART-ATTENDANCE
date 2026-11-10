<?php

use App\Modules\Classrooms\Controllers\ClassroomController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::apiResource('classrooms', ClassroomController::class);
    });
