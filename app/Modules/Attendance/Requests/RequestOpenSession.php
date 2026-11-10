<?php

namespace App\Modules\Attendance\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class RequestOpenSession extends FormRequest
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
            'class_section_id' => ['required', 'integer', 'exists:class_sections,id'],
            'class_schedule_id' => ['sometimes', 'nullable', 'integer', 'exists:class_schedules,id'],
            'classroom_id' => ['sometimes', 'nullable', 'integer', 'exists:classrooms,id'],
            'session_date' => ['required', 'date'],
            'starts_at' => ['required', 'date'],
            'late_after' => ['required', 'date', 'after_or_equal:starts_at'],
            'closes_at' => ['required', 'date', 'after_or_equal:late_after'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                if ($this->input('classroom_id') === null && $this->input('class_schedule_id') === null) {
                    $validator->errors()->add(
                        'classroom_id',
                        'A classroom or class schedule is required.'
                    );
                }
            },
        ];
    }
}
