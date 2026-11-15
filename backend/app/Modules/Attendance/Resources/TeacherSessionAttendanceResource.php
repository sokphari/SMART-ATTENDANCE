<?php

namespace App\Modules\Attendance\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeacherSessionAttendanceResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $student = $this->student;
        $attendance = $student->attendances->first();

        return [
            'student_id' => $student->id,
            'student_code' => $student->student_code,
            'name' => $student->user?->name,
            'email' => $student->user?->email,
            'enrollment_status' => $this->status?->value,
            'status' => $attendance?->status?->value ?? 'unmarked',
            'verification_method' => $attendance?->verification_method?->value,
            'checked_in_at' => $attendance?->checked_in_at?->toIso8601String(),
            'remarks' => $attendance?->remarks,
            'marked_by' => $attendance?->markedBy?->name,
        ];
    }
}
