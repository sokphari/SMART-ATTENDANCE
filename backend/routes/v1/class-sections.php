<?php

use App\Modules\ClassSections\Controllers\ClassSectionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::apiResource('class-sections', ClassSectionController::class);
    });
