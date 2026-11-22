<?php

namespace App\Modules\Students\Resources;

use App\Modules\Departments\Resources\DepartmentResource;
use App\Modules\Users\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => new UserResource($this->whenLoaded('user')),
            'department_id' => $this->department_id,
            'program_id' => $this->program_id,
            'program' => $this->whenLoaded('program', fn () => ['id' => $this->program?->id, 'code' => $this->program?->code, 'name' => $this->program?->name]),
            'department' => new DepartmentResource($this->whenLoaded('department')),
            'student_code' => $this->student_code,
            'attendance_id' => $this->attendanceId(),
            'year_level' => $this->year_level,
            'phone' => $this->phone,
            'gender' => $this->gender,
            'current_enrollment' => $this->whenLoaded('enrollments', function (): ?array {
                $enrollment = $this->enrollments->first();
                if (! $enrollment) {
                    return null;
                }

                return [
                    'id' => $enrollment->id,
                    'class_section_id' => $enrollment->class_section_id,
                    'section_code' => $enrollment->classSection?->section_code,
                    'course_id' => $enrollment->classSection?->course_id,
                    'semester_id' => $enrollment->classSection?->semester_id,
                    'section_status' => $enrollment->classSection?->status?->value,
                    'course_name' => $enrollment->classSection?->course?->name,
                    'department_name' => $enrollment->classSection?->course?->department?->name,
                    'semester_name' => $enrollment->classSection?->semester?->name,
                    'academic_year' => $enrollment->classSection?->semester?->academicYear?->name,
                    'needs_setup' => (bool) $this->getAttribute('registration_section_created'),
                ];
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
