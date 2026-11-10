<?php

namespace App\Modules\Attendance\Requests;

use App\Enums\AttendanceCorrectionStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestReviewCorrection extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in([
                AttendanceCorrectionStatus::Approved->value,
                AttendanceCorrectionStatus::Rejected->value,
            ])],
            'review_note' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
