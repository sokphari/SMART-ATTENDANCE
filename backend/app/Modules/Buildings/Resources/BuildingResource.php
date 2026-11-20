<?php

namespace App\Modules\Buildings\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BuildingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'code' => $this->code, 'name' => $this->name,
            'description' => $this->description, 'status' => $this->status,
            'floors_count' => $this->whenCounted('floors'),
            'classrooms_count' => $this->whenCounted('classrooms'),
            'total_seats' => $this->when(
                array_key_exists('classrooms_sum_capacity', $this->resource->getAttributes()),
                fn () => (int) ($this->classrooms_sum_capacity ?? 0),
            ),
            'floors' => FloorResource::collection($this->whenLoaded('floors')),
        ];
    }
}
