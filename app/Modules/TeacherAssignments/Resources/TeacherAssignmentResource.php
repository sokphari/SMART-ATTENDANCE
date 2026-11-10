<?php

namespace App\Modules\TeacherAssignments\Resources;

use App\Modules\ClassSections\Resources\ClassSectionResource;
use App\Modules\Teachers\Resources\TeacherResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeacherAssignmentResource extends JsonResource
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
            'teacher_id' => $this->teacher_id,
            'teacher' => new TeacherResource($this->whenLoaded('teacher')),
            'assigned_at' => $this->assigned_at?->toIso8601String(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
