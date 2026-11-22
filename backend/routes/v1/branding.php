<?php

use App\Modules\Branding\Controllers\BrandingController;
use Illuminate\Support\Facades\Route;

Route::get('branding', [BrandingController::class, 'show']);

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::put('branding', [BrandingController::class, 'update']);
    });
