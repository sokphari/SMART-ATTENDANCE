<?php

namespace App\Modules\Attendance\Requests;

use App\Enums\AttendanceStatus;
use Illuminate\Foundation\Http\FormRequest;

class RequestManualAttendance extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'records' => ['required', 'array', 'min:1', 'max:100'],
            'records.*.student_id' => ['required', 'integer', 'distinct'],
            'records.*.status' => ['required', 'string', 'in:'.implode(',', AttendanceStatus::values())],
            'records.*.remarks' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
