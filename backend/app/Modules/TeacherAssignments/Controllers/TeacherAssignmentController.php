<?php

namespace App\Modules\TeacherAssignments\Controllers;

use App\Http\Controllers\Controller;
use App\Models\TeacherAssignment;
use App\Modules\TeacherAssignments\Requests\RequestStore;
use App\Modules\TeacherAssignments\Requests\RequestUpdate;
use App\Modules\TeacherAssignments\Resources\TeacherAssignmentResource;
use App\Modules\TeacherAssignments\Services\TeacherAssignmentServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TeacherAssignmentController extends Controller
{
    public function __construct(private readonly TeacherAssignmentServices $assignments) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $assignments = $this->assignments->paginate(
            $request->only(['search', 'class_section_id', 'teacher_id', 'per_page'])
        );

        return TeacherAssignmentResource::collection($assignments);
    }

    public function store(RequestStore $request): JsonResponse
    {
        $assignment = $this->assignments->create($request->validated());

        return (new TeacherAssignmentResource($assignment))->response()->setStatusCode(201);
    }

    public function show(TeacherAssignment $teacherAssignment): TeacherAssignmentResource
    {
        $teacherAssignment->load([
            'classSection.course.department',
            'classSection.semester',
            'teacher.user',
            'teacher.department',
        ]);

        return new TeacherAssignmentResource($teacherAssignment);
    }

    public function update(RequestUpdate $request, TeacherAssignment $teacherAssignment): TeacherAssignmentResource
    {
        return new TeacherAssignmentResource(
            $this->assignments->update($teacherAssignment, $request->validated())
        );
    }

    public function destroy(TeacherAssignment $teacherAssignment): JsonResponse
    {
        $this->assignments->unassign($teacherAssignment);

        return response()->json(null, 204);
    }
}
