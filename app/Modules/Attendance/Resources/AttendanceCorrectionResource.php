<?php

namespace App\Modules\Attendance\Resources;

use App\Modules\Users\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceCorrectionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'attendance_id' => $this->attendance_id,
            'attendance' => new AttendanceResource($this->whenLoaded('attendance')),
            'requested_by' => $this->requested_by,
            'requester' => new UserResource($this->whenLoaded('requestedBy')),
            'reviewed_by' => $this->reviewed_by,
            'reviewer' => new UserResource($this->whenLoaded('reviewedBy')),
            'reason' => $this->reason,
            'requested_status' => $this->requested_status?->value,
            'status' => $this->status?->value,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'review_note' => $this->review_note,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
