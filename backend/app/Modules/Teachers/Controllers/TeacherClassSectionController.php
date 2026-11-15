<?php

namespace App\Modules\Teachers\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Teacher;
use App\Modules\Teachers\Resources\TeacherClassSectionResource;
use App\Modules\Teachers\Resources\TeacherStudentRosterResource;
use App\Modules\Teachers\Services\TeacherClassSectionServices;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TeacherClassSectionController extends Controller
{
    public function __construct(private readonly TeacherClassSectionServices $sections) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['sometimes', 'nullable', 'in:active,inactive'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        return TeacherClassSectionResource::collection(
            $this->sections->paginateForTeacher($this->teacher($request), $filters)
        );
    }

    public function show(Request $request, int $classSection): TeacherClassSectionResource
    {
        return new TeacherClassSectionResource(
            $this->sections->findAssigned($this->teacher($request), $classSection)
        );
    }

    public function students(Request $request, int $classSection): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        return TeacherStudentRosterResource::collection(
            $this->sections->roster($this->teacher($request), $classSection, $filters)
        );
    }

    public function schedules(Request $request, int $classSection): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'date_from' => ['sometimes', 'nullable', 'date'],
            'date_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:date_from'],
        ]);

        return \App\Modules\ClassSchedules\Resources\ClassScheduleResource::collection(
            $this->sections->schedules($this->teacher($request), $classSection, $filters)
        );
    }

    private function teacher(Request $request): Teacher
    {
        $teacher = $request->user()?->teacher;
        abort_if($teacher === null, 403, 'Teacher profile not found.');

        return $teacher;
    }
}
