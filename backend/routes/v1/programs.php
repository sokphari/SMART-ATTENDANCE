<?php

use App\Modules\Programs\Controllers\ProgramController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function (): void {
    Route::apiResource('programs', ProgramController::class);
});
