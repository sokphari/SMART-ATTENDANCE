<?php

namespace App\Modules\Programs\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Program;
use App\Modules\Programs\Requests\RequestStore;
use App\Modules\Programs\Requests\RequestUpdate;
use App\Modules\Programs\Resources\ProgramResource;
use App\Modules\Programs\Services\ProgramServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProgramController extends Controller
{
    public function __construct(private readonly ProgramServices $programs) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return ProgramResource::collection($this->programs->paginate($request->only(['search', 'department_id', 'status', 'per_page'])));
    }

    public function store(RequestStore $request): JsonResponse
    {
        return (new ProgramResource($this->programs->create($request->validated())))->response()->setStatusCode(201);
    }

    public function show(Program $program): ProgramResource
    {
        return new ProgramResource($program->load('department'));
    }

    public function update(RequestUpdate $request, Program $program): ProgramResource
    {
        return new ProgramResource($this->programs->update($program, $request->validated()));
    }

    public function destroy(Program $program): JsonResponse
    {
        $this->programs->deactivate($program);
        return response()->json(null, 204);
    }
}
