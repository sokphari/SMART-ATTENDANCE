<?php

namespace App\Modules\Attendance\Requests;

use App\Enums\AttendanceStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestTeacherStoreCorrection extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'attendance_id' => ['required', 'integer'],
            'requested_status' => ['required', Rule::enum(AttendanceStatus::class)],
            'reason' => ['required', 'string', 'min:5', 'max:2000'],
        ];
    }
}
