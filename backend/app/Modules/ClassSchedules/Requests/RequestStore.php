<?php

namespace App\Modules\ClassSchedules\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestStore extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $data = [];

        foreach (['start_time', 'end_time'] as $field) {
            $value = $this->input($field);

            if (is_string($value) && preg_match('/^\d{2}:\d{2}$/', $value) === 1) {
                $data[$field] = $value.':00';
            }
        }

        if ($data !== []) {
            $this->merge($data);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'class_section_id' => ['required', 'integer', 'exists:class_sections,id'],
            'classroom_id' => ['required', 'integer', 'exists:classrooms,id'],
            'time_slot_id' => ['sometimes', 'nullable', 'integer', 'exists:schedule_time_slots,id'],
            'day_of_week' => ['required_without:days_of_week', 'integer', 'between:1,7'],
            'days_of_week' => ['sometimes', 'required', 'array', 'min:1', 'max:5'],
            'days_of_week.*' => ['required', 'integer', 'between:1,5', 'distinct'],
            'start_time' => ['required_without:time_slot_id', 'date_format:H:i:s'],
            'end_time' => ['required_without:time_slot_id', 'date_format:H:i:s'],
            'effective_from' => ['sometimes', 'nullable', 'date'],
            'effective_until' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ];
    }
}
