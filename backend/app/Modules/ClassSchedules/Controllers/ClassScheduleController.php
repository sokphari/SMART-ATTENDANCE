<?php

namespace App\Modules\ClassSchedules\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ClassSchedule;
use App\Modules\ClassSchedules\Requests\RequestStore;
use App\Modules\ClassSchedules\Requests\RequestUpdate;
use App\Modules\ClassSchedules\Resources\ClassScheduleResource;
use App\Modules\ClassSchedules\Services\ClassScheduleServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ClassScheduleController extends Controller
{
    public function __construct(private readonly ClassScheduleServices $classSchedules) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $classSchedules = $this->classSchedules->paginate(
            $request->only(['search', 'class_section_id', 'classroom_id', 'day_of_week', 'per_page'])
        );

        return ClassScheduleResource::collection($classSchedules);
    }

    public function store(RequestStore $request): JsonResponse
    {
        $classSchedule = $this->classSchedules->create($request->validated());

        return (new ClassScheduleResource($classSchedule))->response()->setStatusCode(201);
    }

    public function show(ClassSchedule $classSchedule): ClassScheduleResource
    {
        $classSchedule->load([
            'classSection.course.department',
            'classSection.semester',
            'classroom',
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
