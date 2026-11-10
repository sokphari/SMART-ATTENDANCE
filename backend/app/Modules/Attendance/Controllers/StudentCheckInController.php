<?php

namespace App\Modules\Attendance\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Attendance\Requests\RequestCheckIn;
use App\Modules\Attendance\Resources\AttendanceResource;
use App\Modules\Attendance\Services\AttendanceCheckInServices;
use Illuminate\Http\JsonResponse;

class StudentCheckInController extends Controller
{
    public function __construct(private readonly AttendanceCheckInServices $checkIns) {}

    public function store(RequestCheckIn $request): JsonResponse
    {
        $student = $request->user()?->student;

        abort_if($student === null, 403, 'Student profile not found.');

        $attendance = $this->checkIns->checkIn($student, $request->validated());

        return (new AttendanceResource($attendance))->response()->setStatusCode(201);
    }
}
