<?php

namespace App\Modules\Buildings\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FloorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'building_id' => $this->building_id,
            'building' => $this->whenLoaded('building', fn () => ['id' => $this->building?->id, 'code' => $this->building?->code, 'name' => $this->building?->name]),
            'floor_number' => $this->floor_number,
            'name' => $this->name,
            'status' => $this->status,
            'classrooms_count' => $this->whenCounted('classrooms'),
        ];
    }
}
