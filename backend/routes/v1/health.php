<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

Route::get('health', function () {
    $databaseStatus = 'connected';

    try {
        DB::connection()->select('select 1');
    } catch (\Throwable) {
        $databaseStatus = 'unavailable';
    }

    return response()->json([
        'status' => $databaseStatus === 'connected' ? 'ok' : 'degraded',
        'service' => 'smart-attendance',
        'timestamp' => now()->toIso8601String(),
        'checks' => [
            'api' => ['status' => 'connected'],
            'database' => ['status' => $databaseStatus],
        ],
    ]);
});
