<?php

namespace App\Modules\Students\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Modules\Students\Requests\RequestStore;
use App\Modules\Students\Requests\RequestUpdate;
use App\Modules\Students\Resources\StudentResource;
use App\Modules\Students\Services\StudentServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StudentController extends Controller
{
    public function __construct(private readonly StudentServices $students) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $students = $this->students->paginate(
            $request->only(['search', 'department_id', 'status', 'year_level', 'per_page'])
        );

        return StudentResource::collection($students);
    }

    public function store(RequestStore $request): JsonResponse
    {
        $student = $this->students->create($request->validated());

        return (new StudentResource($student))->response()->setStatusCode(201);
    }

    public function show(Student $student): StudentResource
    {
        $student->load(['user', 'department']);

        return new StudentResource($student);
    }

    public function update(RequestUpdate $request, Student $student): StudentResource
    {
        return new StudentResource(
            $this->students->update($student, $request->validated())
        );
    }

    public function destroy(Student $student): JsonResponse
    {
        $this->students->deactivate($student);

        return response()->json(null, 204);
    }
}
