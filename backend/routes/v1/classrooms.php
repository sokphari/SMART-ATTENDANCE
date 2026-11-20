<?php

use App\Modules\Classrooms\Controllers\ClassroomController;
use App\Modules\Buildings\Controllers\BuildingController;
use App\Modules\Buildings\Controllers\FloorController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::apiResource('buildings', BuildingController::class);
        Route::get('buildings/{building}/floors', [BuildingController::class, 'floors']);
        Route::post('buildings/{building}/floors', [BuildingController::class, 'storeFloor']);
        Route::apiResource('floors', FloorController::class)->except(['store']);
        Route::apiResource('classrooms', ClassroomController::class);
    });
