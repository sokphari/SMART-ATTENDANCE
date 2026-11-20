<?php

namespace App\Modules\Attendance\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSession;
use App\Modules\Attendance\Resources\AttendanceSessionResource;
use App\Modules\Attendance\Services\AttendanceSessionServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdminAttendanceQrController extends Controller
{
    public function __construct(private readonly AttendanceSessionServices $sessions) {}

    /** Only currently scannable sessions are offered in the Admin QR picker. */
    public function index(): AnonymousResourceCollection
    {
        return AttendanceSessionResource::collection(
            AttendanceSession::query()
                ->with(['classSection.course.department', 'teacher.user', 'classroom'])
                ->where('status', 'open')
                ->where('starts_at', '<=', now())
                ->where('closes_at', '>', now())
                ->orderBy('closes_at')
                ->limit(100)
                ->get()
        );
    }

    /** Admins can display QR for an existing teacher-created session, not create a new one. */
    public function issue(AttendanceSession $attendanceSession): JsonResponse
    {
        return response()->json([
            'data' => $this->sessions->generateQrTokenForAdmin($attendanceSession),
        ], 201);
    }
}
