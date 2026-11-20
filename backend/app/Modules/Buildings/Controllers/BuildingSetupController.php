<?php

namespace App\Modules\Buildings\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Buildings\Requests\RequestBuildingSetup;
use App\Modules\Buildings\Services\BuildingServices;
use App\Modules\Buildings\Services\FloorServices;
use App\Modules\Classrooms\Services\ClassroomServices;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class BuildingSetupController extends Controller
{
    public function __construct(
        private readonly BuildingServices $buildings,
        private readonly FloorServices $floors,
        private readonly ClassroomServices $classrooms,
    ) {}

    public function __invoke(RequestBuildingSetup $request): JsonResponse
    {
        $input = $request->validated();

        $summary = DB::transaction(function () use ($input): array {
            $building = $this->buildings->create([
                ...$input['building'],
                'status' => 'active',
            ]);
            $floorCount = 0;
            $roomCount = 0;
            $seatCount = 0;

            foreach ($input['floors'] as $floorData) {
                $floor = $this->floors->create($building, [
                    'name' => $floorData['name'],
                    'floor_number' => $floorData['floor_number'],
                ]);
                $floorCount++;

                foreach ($floorData['rooms'] as $roomData) {
                    $this->classrooms->create([
                        'floor_id' => $floor->id,
                        'room_code' => $roomData['room_code'],
                        'capacity' => $roomData['capacity'],
                        'room_type' => $roomData['room_type'],
                        'latitude' => $roomData['latitude'] ?? null,
                        'longitude' => $roomData['longitude'] ?? null,
                        'allowed_radius_meters' => $roomData['allowed_radius_meters'] ?? 100,
                    ]);
                    $roomCount++;
                    $seatCount += (int) $roomData['capacity'];
                }
            }

            return [
                'id' => $building->id,
                'code' => $building->code,
                'name' => $building->name,
                'floors_count' => $floorCount,
                'classrooms_count' => $roomCount,
                'total_seats' => $seatCount,
            ];
        });

        return response()->json(['data' => $summary, 'message' => 'Building created successfully.'], 201);
    }
}
