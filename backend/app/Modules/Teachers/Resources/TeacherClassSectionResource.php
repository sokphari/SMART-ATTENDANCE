<?php

namespace App\Modules\Teachers\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeacherClassSectionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'section_code' => $this->section_code,
            'status' => $this->status?->value,
            'capacity' => $this->capacity,
            'enrolled_count' => $this->whenCounted('enrollments'),
            'course' => [
                'id' => $this->course->id,
                'code' => $this->course->course_code,
                'name' => $this->course->name,
                'department' => $this->course->department?->name,
            ],
            'semester' => [
                'id' => $this->semester->id,
                'name' => $this->semester->name,
                'start_date' => $this->semester->start_date?->toDateString(),
                'end_date' => $this->semester->end_date?->toDateString(),
                'academic_year' => $this->semester->academicYear?->name,
            ],
            'schedules' => $this->whenLoaded('classSchedules', fn () => $this->classSchedules->map(fn ($schedule) => [
                'id' => $schedule->id,
                'day_of_week' => $schedule->day_of_week,
                'start_time' => $schedule->start_time,
                'end_time' => $schedule->end_time,
                'effective_from' => $schedule->effective_from?->toDateString(),
                'effective_until' => $schedule->effective_until?->toDateString(),
                'classroom' => $schedule->classroom ? [
                    'id' => $schedule->classroom->id,
                    'room_code' => $schedule->classroom->room_code,
                    'building' => $schedule->classroom->building,
                    'floor' => $schedule->classroom->floor,
                ] : null,
            ])),
        ];
    }
}
