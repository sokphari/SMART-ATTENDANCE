<?php

namespace App\Modules\ClassSchedules\Requests;

use App\Modules\ClassSchedules\Requests\Concerns\ValidatesScheduleConflicts;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class RequestStore extends FormRequest
{
    use ValidatesScheduleConflicts;

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
            'day_of_week' => ['required', 'integer', 'between:1,7'],
            'start_time' => ['required', 'date_format:H:i:s'],
            'end_time' => ['required', 'date_format:H:i:s'],
            'effective_from' => ['sometimes', 'nullable', 'date'],
            'effective_until' => ['sometimes', 'nullable', 'date'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            fn (Validator $validator) => $this->validateSchedule($validator),
        ];
    }
}
