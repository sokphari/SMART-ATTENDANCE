<?php

namespace App\Modules\Enrollments\Resources;

use App\Modules\ClassSections\Resources\ClassSectionResource;
use App\Modules\Students\Resources\StudentResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EnrollmentResource extends JsonResource
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
            'student_id' => $this->student_id,
            'student' => new StudentResource($this->whenLoaded('student')),
            'enrollment_date' => $this->enrollment_date?->toDateString(),
            'status' => $this->status?->value,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
