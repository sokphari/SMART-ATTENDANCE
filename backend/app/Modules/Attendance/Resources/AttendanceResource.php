<?php

namespace App\Modules\Attendance\Resources;

use App\Modules\Students\Resources\StudentResource;
use App\Modules\Users\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'attendance_session_id' => $this->attendance_session_id,
            'session' => new AttendanceSessionResource($this->whenLoaded('attendanceSession')),
            'student_id' => $this->student_id,
            'student' => new StudentResource($this->whenLoaded('student')),
            'status' => $this->status?->value,
            'verification_method' => $this->verification_method?->value,
            'latitude' => $this->latitude === null ? null : (float) $this->latitude,
            'longitude' => $this->longitude === null ? null : (float) $this->longitude,
            'gps_accuracy_meters' => $this->gps_accuracy_meters === null ? null : (float) $this->gps_accuracy_meters,
            'distance_meters' => $this->distance_meters === null ? null : (float) $this->distance_meters,
            'checked_in_at' => $this->checked_in_at?->toIso8601String(),
            'marked_by' => $this->whenLoaded('markedBy', fn () => new UserResource($this->markedBy)),
            'remarks' => $this->remarks,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
