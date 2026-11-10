<?php

use Illuminate\Support\Facades\Route;

Route::get('health', fn () => response()->json([
    'status' => 'ok',
    'service' => 'smart-attendance',
    'timestamp' => now()->toIso8601String(),
]));
