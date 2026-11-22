<?php

use App\Modules\Attendance\Controllers\LocalStudentCheckInController;
use Illuminate\Support\Facades\Route;

Route::get('attendance/local-scan-availability', [LocalStudentCheckInController::class, 'availability']);
Route::middleware('throttle:6,1')->post('attendance/local-check-in', [LocalStudentCheckInController::class, 'store']);
