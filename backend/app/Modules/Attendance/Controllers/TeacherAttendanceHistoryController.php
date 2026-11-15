<?php

namespace App\Modules\Attendance\Controllers;

use App\Enums\AttendanceStatus;
use App\Http\Controllers\Controller;
use App\Models\Teacher;
use App\Modules\Attendance\Resources\AttendanceResource;
use App\Modules\Attendance\Services\AttendanceServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TeacherAttendanceHistoryController extends Controller
{
    public function __construct(private readonly AttendanceServices $attendance) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'class_section_id' => ['sometimes', 'nullable', 'integer'],
            'status' => ['sometimes', 'nullable', 'in:'.implode(',', AttendanceStatus::values())],
            'date_from' => ['sometimes', 'nullable', 'date'],
            'date_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:date_from'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        return AttendanceResource::collection(
            $this->attendance->paginateForTeacher($this->teacher($request), $filters)
        );
    }

    public function report(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'class_section_id' => ['sometimes', 'nullable', 'integer'],
            'date_from' => ['sometimes', 'nullable', 'date'],
            'date_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:date_from'],
        ]);

        return response()->json([
            'data' => $this->attendance->reportForTeacher($this->teacher($request), $filters),
        ]);
    }

    private function teacher(Request $request): Teacher
    {
        $teacher = $request->user()?->teacher;
        abort_if(! $teacher instanceof Teacher, 403, 'Teacher profile not found.');

        return $teacher;
    }
}
