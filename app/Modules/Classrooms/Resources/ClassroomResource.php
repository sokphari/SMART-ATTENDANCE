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
            'building' => $this->building,
            'floor' => $this->floor,
            'latitude' => (float) $this->latitude,
            'longitude' => (float) $this->longitude,
            'allowed_radius_meters' => $this->allowed_radius_meters,
            'status' => $this->status?->value,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
