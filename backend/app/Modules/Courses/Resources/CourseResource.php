<?php

namespace App\Modules\Courses\Resources;

use App\Modules\Departments\Resources\DepartmentResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'department_id' => $this->department_id,
            'program_id' => $this->program_id,
            'program' => $this->whenLoaded('program', fn () => ['id' => $this->program?->id, 'code' => $this->program?->code, 'name' => $this->program?->name]),
            'department' => new DepartmentResource($this->whenLoaded('department')),
            'course_code' => $this->course_code,
            'name' => $this->name,
            'description' => $this->description,
            'credits' => $this->credits,
            'status' => $this->status?->value,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
