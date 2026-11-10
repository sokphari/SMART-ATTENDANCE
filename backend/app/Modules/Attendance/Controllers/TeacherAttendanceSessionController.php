<?php

namespace App\Modules\Attendance\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSession;
use App\Models\Teacher;
use App\Modules\Attendance\Requests\RequestOpenSession;
use App\Modules\Attendance\Resources\AttendanceSessionResource;
use App\Modules\Attendance\Services\AttendanceSessionServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TeacherAttendanceSessionController extends Controller
{
    public function __construct(private readonly AttendanceSessionServices $sessions) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $sessions = $this->sessions->paginateForTeacher(
            $this->teacher($request),
            $request->only(['status', 'class_section_id', 'date_from', 'date_to', 'per_page'])
        );

        return AttendanceSessionResource::collection($sessions);
    }

    public function store(RequestOpenSession $request): JsonResponse
    {
        $session = $this->sessions->open($this->teacher($request), $request->validated());

        return (new AttendanceSessionResource($session))->response()->setStatusCode(201);
    }

    public function show(Request $request, AttendanceSession $attendanceSession): AttendanceSessionResource
    {
        $this->sessions->ensureOwnedBy($attendanceSession, $this->teacher($request));

        return new AttendanceSessionResource(
            $this->sessions->loadRelations($attendanceSession)
        );
    }

    public function qrToken(Request $request, AttendanceSession $attendanceSession): JsonResponse
    {
        $token = $this->sessions->generateQrToken(
            $attendanceSession,
            $this->teacher($request)
        );

        return response()->json(['data' => $token], 201);
    }

    public function close(Request $request, AttendanceSession $attendanceSession): JsonResponse
    {
        $session = $this->sessions->close(
            $attendanceSession,
            $this->teacher($request)
        );

        return response()->json([
            'data' => new AttendanceSessionResource($session),
            'summary' => $this->sessions->summary($session),
        ]);
    }

    private function teacher(Request $request): Teacher
    {
        $teacher = $request->user()?->teacher;

        abort_if($teacher === null, 403, 'Teacher profile not found.');

        return $teacher;
    }
}
