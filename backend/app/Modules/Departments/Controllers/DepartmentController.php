<?php

namespace App\Modules\Departments\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Modules\Departments\Requests\RequestStore;
use App\Modules\Departments\Requests\RequestUpdate;
use App\Modules\Departments\Resources\DepartmentResource;
use App\Modules\Departments\Services\DepartmentServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DepartmentController extends Controller
{
    public function __construct(private readonly DepartmentServices $departments) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $departments = $this->departments->paginate(
            $request->only(['search', 'status', 'per_page'])
        );

        return DepartmentResource::collection($departments);
    }

    public function store(RequestStore $request): JsonResponse
    {
        $department = $this->departments->create($request->validated());

        return (new DepartmentResource($department))->response()->setStatusCode(201);
    }

    public function show(Department $department): DepartmentResource
    {
        return new DepartmentResource($department);
    }

    public function update(RequestUpdate $request, Department $department): DepartmentResource
    {
        return new DepartmentResource(
            $this->departments->update($department, $request->validated())
        );
    }

    public function destroy(Department $department): JsonResponse
    {
        $this->departments->deactivate($department);

        return response()->json(null, 204);
    }
}
