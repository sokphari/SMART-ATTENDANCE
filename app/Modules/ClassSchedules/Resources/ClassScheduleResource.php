<?php

namespace App\Modules\ClassSchedules\Resources;

use App\Modules\Classrooms\Resources\ClassroomResource;
use App\Modules\ClassSections\Resources\ClassSectionResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClassScheduleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'class_section_id' => $this->class_section_id,
            'class_section' => new ClassSectionResource($this->whenLoaded('classSection')),
            'classroom_id' => $this->classroom_id,
            'classroom' => new ClassroomResource($this->whenLoaded('classroom')),
            'day_of_week' => $this->day_of_week,
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'effective_from' => $this->effective_from?->toDateString(),
            'effective_until' => $this->effective_until?->toDateString(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
