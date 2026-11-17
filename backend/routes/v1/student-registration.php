<?php

use App\Modules\Students\Controllers\StudentRegistrationController;
use App\Modules\Students\Controllers\StudentRegistrationLinkController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin', 'throttle:10,1'])
    ->prefix('admin/student-registration-links')
    ->group(function (): void {
        Route::post('/', [StudentRegistrationLinkController::class, 'store']);
        Route::get('/{registrationLink}', [StudentRegistrationLinkController::class, 'show']);
        Route::post('/{registrationLink}/revoke', [StudentRegistrationLinkController::class, 'revoke']);
    });

Route::prefix('student-registrations/{token}')
    ->middleware('throttle:30,1')
    ->group(function (): void {
        Route::get('/', [StudentRegistrationController::class, 'show']);
        Route::get('/departments', [StudentRegistrationController::class, 'departments']);
        Route::post('/', [StudentRegistrationController::class, 'store'])->middleware('throttle:8,1');
    });
