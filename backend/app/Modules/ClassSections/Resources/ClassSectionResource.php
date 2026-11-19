<?php

namespace App\Modules\ClassSections\Resources;

use App\Modules\Courses\Resources\CourseResource;
use App\Modules\Semesters\Resources\SemesterResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClassSectionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'course' => new CourseResource($this->whenLoaded('course')),
            'semester_id' => $this->semester_id,
            'semester' => new SemesterResource($this->whenLoaded('semester')),
            'section_code' => $this->section_code,
            'capacity' => $this->capacity,
            'status' => $this->status?->value,
            'enrolled_count' => $this->enrolled_count ?? $this->enrollments_count ?? 0,
            'teachers' => $this->whenLoaded('teacherAssignments', function () {
                return $this->teacherAssignments->map(function ($assignment) {
                    return [
                        'id' => $assignment->teacher?->id,
                        'name' => $assignment->teacher?->user?->name ?? 'Unassigned',
                        'code' => $assignment->teacher?->teacher_code,
                        'role' => $assignment->role ?? 'Primary',
                    ];
                });
            }),
            'schedules' => $this->whenLoaded('classSchedules', function () {
                return $this->classSchedules->map(function ($sched) {
                    return [
                        'id' => $sched->id,
                        'day_of_week' => $sched->day_of_week,
                        'start_time' => substr((string) $sched->start_time, 0, 5),
                        'end_time' => substr((string) $sched->end_time, 0, 5),
                        'time_slot_id' => $sched->time_slot_id,
                        'period' => $sched->timeSlot?->studyPeriod?->name,
                        'status' => $sched->status?->value,
                        'room' => $sched->classroom?->room_code ?? 'Room TBD',
                    ];
                });
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
