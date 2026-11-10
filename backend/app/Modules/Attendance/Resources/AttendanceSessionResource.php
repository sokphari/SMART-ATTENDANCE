<?php

namespace App\Modules\Attendance\Resources;

use App\Modules\Classrooms\Resources\ClassroomResource;
use App\Modules\ClassSections\Resources\ClassSectionResource;
use App\Modules\Teachers\Resources\TeacherResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceSessionResource extends JsonResource
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
            'class_schedule_id' => $this->class_schedule_id,
            'teacher_id' => $this->teacher_id,
            'teacher' => new TeacherResource($this->whenLoaded('teacher')),
            'classroom_id' => $this->classroom_id,
            'classroom' => new ClassroomResource($this->whenLoaded('classroom')),
            'session_date' => $this->session_date?->toDateString(),
            'starts_at' => $this->starts_at?->toIso8601String(),
            'late_after' => $this->late_after?->toIso8601String(),
            'closes_at' => $this->closes_at?->toIso8601String(),
            'closed_at' => $this->closed_at?->toIso8601String(),
            'status' => $this->status?->value,
            'allowed_latitude' => (float) $this->allowed_latitude,
            'allowed_longitude' => (float) $this->allowed_longitude,
            'allowed_radius_meters' => $this->allowed_radius_meters,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
