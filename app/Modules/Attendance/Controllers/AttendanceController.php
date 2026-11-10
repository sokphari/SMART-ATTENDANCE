<?php

namespace App\Modules\Attendance\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Attendance\Resources\AttendanceResource;
use App\Modules\Attendance\Services\AttendanceServices;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AttendanceController extends Controller
{
    public function __construct(private readonly AttendanceServices $attendance) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $attendance = $this->attendance->paginate(
            $request->only([
                'search',
                'class_section_id',
                'attendance_session_id',
                'student_id',
                'status',
                'date_from',
                'date_to',
                'per_page',
            ])
        );

        return AttendanceResource::collection($attendance);
    }
}
