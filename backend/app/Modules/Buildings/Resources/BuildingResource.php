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
            'floors' => FloorResource::collection($this->whenLoaded('floors')),
        ];
    }
}
