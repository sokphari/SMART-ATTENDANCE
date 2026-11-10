<?php

namespace App\Modules\Attendance\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Attendance\Services\AttendanceServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceReportController extends Controller
{
    public function __construct(private readonly AttendanceServices $attendance) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->attendance->report(
                $request->only(['class_section_id', 'semester_id', 'date_from', 'date_to'])
            ),
        ]);
    }
}
