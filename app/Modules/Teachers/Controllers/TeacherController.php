<?php

namespace App\Modules\Teachers\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Teacher;
use App\Modules\Teachers\Requests\RequestStore;
use App\Modules\Teachers\Requests\RequestUpdate;
use App\Modules\Teachers\Resources\TeacherResource;
use App\Modules\Teachers\Services\TeacherServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TeacherController extends Controller
{
    public function __construct(private readonly TeacherServices $teachers) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $teachers = $this->teachers->paginate(
            $request->only(['search', 'department_id', 'status', 'per_page'])
        );

        return TeacherResource::collection($teachers);
    }

    public function store(RequestStore $request): JsonResponse
    {
        $teacher = $this->teachers->create($request->validated());

        return (new TeacherResource($teacher))->response()->setStatusCode(201);
    }

    public function show(Teacher $teacher): TeacherResource
    {
        $teacher->load(['user', 'department']);

        return new TeacherResource($teacher);
    }

    public function update(RequestUpdate $request, Teacher $teacher): TeacherResource
    {
        return new TeacherResource(
            $this->teachers->update($teacher, $request->validated())
        );
    }

    public function destroy(Teacher $teacher): JsonResponse
    {
        $this->teachers->deactivate($teacher);

        return response()->json(null, 204);
    }
}
