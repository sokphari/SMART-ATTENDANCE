<?php

namespace App\Modules\ClassSchedules\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ClassSchedule;
use App\Models\ScheduleTimeSlot;
use App\Models\Teacher;
use App\Modules\ClassSchedules\Requests\RequestStore;
use App\Modules\ClassSchedules\Requests\RequestUpdate;
use App\Modules\ClassSchedules\Requests\RequestUpdateTimeSlot;
use App\Modules\ClassSchedules\Requests\RequestUpdateTimetableSettings;
use App\Modules\ClassSchedules\Resources\ClassScheduleResource;
use App\Modules\ClassSchedules\Services\ClassScheduleServices;
use App\Modules\ClassSchedules\Services\TeacherWorkloadService;
use App\Modules\ClassSchedules\Services\TimetableConfigurationService;
use App\Modules\ClassSchedules\Services\TimetableOverviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ClassScheduleController extends Controller
{
    public function __construct(
        private readonly ClassScheduleServices $classSchedules,
        private readonly TimetableConfigurationService $configuration,
        private readonly TimetableOverviewService $overview,
        private readonly TeacherWorkloadService $workload,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate(['week_start' => ['sometimes', 'date_format:Y-m-d']]);
        $classSchedules = $this->classSchedules->paginate(
            $request->only(['search', 'class_section_id', 'classroom_id', 'day_of_week', 'per_page', 'teacher_id', 'department_id', 'semester_id', 'study_period_id', 'status', 'week_start'])
        );

        return ClassScheduleResource::collection($classSchedules);
    }

    public function summary(Request $request): JsonResponse
    {
        $request->validate([
            'semester_id' => ['sometimes', 'integer', 'exists:semesters,id'],
            'week_start' => ['sometimes', 'date_format:Y-m-d'],
            'department_id' => ['sometimes', 'integer', 'exists:departments,id'],
            'classroom_id' => ['sometimes', 'integer', 'exists:classrooms,id'],
            'day_of_week' => ['sometimes', 'integer', 'between:1,7'],
            'study_period_id' => ['sometimes', 'integer', 'exists:study_periods,id'],
            'teacher_id' => ['sometimes', 'integer', 'exists:teachers,id'],
        ]);
        return response()->json(['data' => $this->overview->summary($request->only(['semester_id', 'week_start', 'department_id', 'classroom_id', 'day_of_week', 'study_period_id', 'teacher_id']))]);
    }

    public function configuration(): JsonResponse
    {
        return response()->json(['data' => $this->configuration->configuration()]);
    }

    public function updateTimeSlot(RequestUpdateTimeSlot $request, ScheduleTimeSlot $timeSlot): JsonResponse
    {
        return response()->json(['data' => $this->configuration->updateSlot($timeSlot, $request->validated())]);
    }

    public function updateSettings(RequestUpdateTimetableSettings $request): JsonResponse
    {
        return response()->json(['data' => $this->configuration->updateSettings($request->validated())]);
    }

    public function teacherWorkload(Request $request, Teacher $teacher): JsonResponse
    {
        $validated = $request->validate(['semester_id' => ['required', 'integer', 'exists:semesters,id']]);

        return response()->json(['data' => $this->workload->report($teacher, (int) $validated['semester_id'])]);
    }

    public function store(RequestStore $request): JsonResponse
    {
        $classSchedule = $this->classSchedules->create($request->validated());

        if (is_array($classSchedule)) {
            return ClassScheduleResource::collection(collect($classSchedule))->response()->setStatusCode(201);
        }

        return (new ClassScheduleResource($classSchedule))->response()->setStatusCode(201);
    }

    public function show(ClassSchedule $classSchedule): ClassScheduleResource
    {
        $classSchedule->load([
            'classSection.course.department',
            'classSection.semester.academicYear',
            'classSection.teacherAssignments.teacher.user',
            'classroom',
            'timeSlot.studyPeriod',
        ]);

        return new ClassScheduleResource($classSchedule);
    }

    public function update(RequestUpdate $request, ClassSchedule $classSchedule): ClassScheduleResource
    {
        return new ClassScheduleResource(
            $this->classSchedules->update($classSchedule, $request->validated())
        );
    }

    public function destroy(ClassSchedule $classSchedule): JsonResponse
    {
        $this->classSchedules->delete($classSchedule);

        return response()->json(null, 204);
    }
}
