<?php

namespace App\Modules\Attendance\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Modules\Attendance\Requests\RequestLocalCheckIn;
use App\Modules\Attendance\Resources\AttendanceResource;
use App\Modules\Attendance\Services\AttendanceCheckInServices;
use Illuminate\Http\JsonResponse;

class LocalStudentCheckInController extends Controller
{
    public function __construct(private readonly AttendanceCheckInServices $checkIns) {}

    public function availability(): JsonResponse
    {
        return response()->json([
            'enabled' => app()->environment('local') && config('attendance.allow_local_qr_testing', false),
        ]);
    }

    public function store(RequestLocalCheckIn $request): JsonResponse
    {
        abort_unless(app()->environment('local') && config('attendance.allow_local_qr_testing', false), 404);
        $data = $request->validated();
        $id = (int) $data['attendance_id'];
        $student = $id > 0 && $id <= 999999999 ? Student::query()->with('user')->find($id) : null;
        if ($student === null || $student->attendanceId() !== $data['attendance_id']
            || $student->user?->status?->value === 'inactive') {
            abort(422, 'Invalid student attendance ID.');
        }
        $record = $this->checkIns->checkIn($student, $data);
        return (new AttendanceResource($record))->response()->setStatusCode(201);
    }
}
