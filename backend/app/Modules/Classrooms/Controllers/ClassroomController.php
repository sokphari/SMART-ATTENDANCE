<?php

namespace App\Modules\Classrooms\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Modules\Classrooms\Requests\RequestStore;
use App\Modules\Classrooms\Requests\RequestUpdate;
use App\Modules\Classrooms\Resources\ClassroomResource;
use App\Modules\Classrooms\Services\ClassroomServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ClassroomController extends Controller
{
    public function __construct(private readonly ClassroomServices $classrooms) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $classrooms = $this->classrooms->paginate(
            $request->only(['search', 'status', 'per_page'])
        );

        return ClassroomResource::collection($classrooms);
    }

    public function store(RequestStore $request): JsonResponse
    {
        $classroom = $this->classrooms->create($request->validated());

        return (new ClassroomResource($classroom))->response()->setStatusCode(201);
    }

    public function show(Classroom $classroom): ClassroomResource
    {
        return new ClassroomResource($classroom);
    }

    public function update(RequestUpdate $request, Classroom $classroom): ClassroomResource
    {
        return new ClassroomResource(
            $this->classrooms->update($classroom, $request->validated())
        );
    }

    public function destroy(Classroom $classroom): JsonResponse
    {
        $this->classrooms->deactivate($classroom);

        return response()->json(null, 204);
    }
}
