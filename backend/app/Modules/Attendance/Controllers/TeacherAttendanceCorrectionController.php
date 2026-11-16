<?php

namespace App\Modules\Attendance\Controllers;

use App\Enums\AttendanceCorrectionStatus;
use App\Http\Controllers\Controller;
use App\Models\Teacher;
use App\Modules\Attendance\Requests\RequestTeacherStoreCorrection;
use App\Modules\Attendance\Resources\AttendanceCorrectionResource;
use App\Modules\Attendance\Services\AttendanceCorrectionServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TeacherAttendanceCorrectionController extends Controller
{
    public function __construct(private readonly AttendanceCorrectionServices $corrections) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['sometimes', 'nullable', 'in:'.implode(',', AttendanceCorrectionStatus::values())],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $teacher = $this->teacher($request);

        return AttendanceCorrectionResource::collection(
            $this->corrections->paginateForTeacher($teacher, $request->user(), $filters)
        );
    }

    public function store(RequestTeacherStoreCorrection $request): JsonResponse
    {
        $correction = $this->corrections->createForTeacher(
            $request->validated(),
            $request->user(),
            $this->teacher($request)
        );

        return (new AttendanceCorrectionResource($correction))
            ->response()
            ->setStatusCode(201);
    }

    private function teacher(Request $request): Teacher
    {
        $teacher = $request->user()?->teacher;
        abort_if(! $teacher instanceof Teacher, 403, 'Teacher profile not found.');

        return $teacher;
    }
}
