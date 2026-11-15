<?php

namespace App\Modules\Teachers\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeacherStudentRosterResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->student->id,
            'student_code' => $this->student->student_code,
            'name' => $this->student->user?->name,
            'email' => $this->student->user?->email,
            'enrollment_status' => $this->status?->value,
        ];
    }
}
