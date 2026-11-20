<?php

namespace App\Modules\Buildings\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Modules\Buildings\Requests\RequestStore;
use App\Modules\Buildings\Requests\RequestUpdate;
use App\Modules\Buildings\Resources\BuildingResource;
use App\Modules\Buildings\Resources\FloorResource;
use App\Modules\Buildings\Requests\RequestFloorStore;
use App\Modules\Buildings\Services\BuildingServices;
use App\Modules\Buildings\Services\FloorServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BuildingController extends Controller
{
    public function __construct(private readonly BuildingServices $buildings, private readonly FloorServices $floors) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return BuildingResource::collection($this->buildings->paginate($request->only(['search', 'status', 'per_page'])));
    }

    public function store(RequestStore $request): JsonResponse
    {
        return (new BuildingResource($this->buildings->create($request->validated())))->response()->setStatusCode(201);
    }

    public function show(Building $building): BuildingResource
    {
        return new BuildingResource($building->load(['floors' => fn ($q) => $q->withCount('classrooms')])->loadCount(['floors', 'classrooms'])->loadSum('classrooms', 'capacity'));
    }

    public function update(RequestUpdate $request, Building $building): BuildingResource
    {
        return new BuildingResource($this->buildings->update($building, $request->validated()));
    }

    public function destroy(Building $building): JsonResponse
    {
        $this->buildings->deactivate($building);
        return response()->json(null, 204);
    }

    public function floors(Request $request, Building $building): AnonymousResourceCollection
    {
        return FloorResource::collection($this->floors->paginate([
            'building_id' => $building->id,
            'status' => $request->input('status'),
            'per_page' => $request->input('per_page', 100),
        ]));
    }

    public function storeFloor(RequestFloorStore $request, Building $building): JsonResponse
    {
        return (new FloorResource($this->floors->create($building, $request->validated())))->response()->setStatusCode(201);
    }
}
