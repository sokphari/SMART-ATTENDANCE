<?php

namespace App\Modules\Classrooms\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClassroomResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'room_code' => $this->room_code,
            'floor_id' => $this->floor_id,
            'floor_details' => $this->whenLoaded('floorRecord', fn () => [
                'id' => $this->floorRecord?->id,
                'name' => $this->floorRecord?->name,
                'floor_number' => $this->floorRecord?->floor_number,
                'building' => $this->floorRecord?->building ? ['id' => $this->floorRecord->building->id, 'code' => $this->floorRecord->building->code, 'name' => $this->floorRecord->building->name] : null,
            ]),
            'building' => $this->building,
            'floor' => $this->floor,
            'capacity' => $this->capacity,
            'room_type' => $this->room_type,
            'latitude' => (float) $this->latitude,
            'longitude' => (float) $this->longitude,
            'allowed_radius_meters' => $this->allowed_radius_meters,
            'status' => $this->status?->value,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
