<?php

use App\Modules\AuditLogs\Controllers\AuditLogController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function (): void {
        Route::get('audit-logs', [AuditLogController::class, 'index']);
    });
