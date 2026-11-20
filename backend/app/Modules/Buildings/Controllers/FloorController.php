<?php

namespace App\Modules\Buildings\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Floor;
use App\Modules\Buildings\Requests\RequestFloorUpdate;
use App\Modules\Buildings\Resources\FloorResource;
use App\Modules\Buildings\Services\FloorServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FloorController extends Controller
{
    public function __construct(private readonly FloorServices $floors) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return FloorResource::collection($this->floors->paginate($request->only(['building_id', 'status', 'per_page'])));
    }

    public function show(Floor $floor): FloorResource
    {
        return new FloorResource($floor->load('building')->loadCount('classrooms'));
    }

    public function update(RequestFloorUpdate $request, Floor $floor): FloorResource
    {
        return new FloorResource($this->floors->update($floor, $request->validated()));
    }

    public function destroy(Floor $floor): JsonResponse
    {
        $this->floors->deactivate($floor);
        return response()->json(null, 204);
    }
}
