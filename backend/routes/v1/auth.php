<?php

use App\Modules\Users\Controllers\AuthController;
use App\Modules\Users\Controllers\AvatarController;
use Illuminate\Support\Facades\Route;

Route::post('auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('profile/avatar', [AvatarController::class, 'store']);
    Route::delete('profile/avatar', [AvatarController::class, 'destroy']);
    Route::get('profile/avatar/{user}', [AvatarController::class, 'show'])->name('profile.avatar');
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
});
