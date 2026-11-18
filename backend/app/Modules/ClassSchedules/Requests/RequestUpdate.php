<?php

namespace App\Modules\ClassSchedules\Requests;

use App\Models\ClassSchedule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestUpdate extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $classSchedule = $this->route('class_schedule');

        if (! $classSchedule instanceof ClassSchedule) {
            return;
        }

        $data = [];

        foreach (['class_section_id', 'classroom_id', 'day_of_week', 'start_time', 'end_time'] as $field) {
            if (! $this->has($field)) {
                $data[$field] = $classSchedule->{$field};
            }
        }

        if (! $this->has('effective_from')) {
            $data['effective_from'] = $classSchedule->effective_from?->toDateString();
        }

        if (! $this->has('effective_until')) {
            $data['effective_until'] = $classSchedule->effective_until?->toDateString();
        }

        foreach (['start_time', 'end_time'] as $field) {
            $value = $data[$field] ?? $this->input($field);

            if (is_string($value) && preg_match('/^\d{2}:\d{2}$/', $value) === 1) {
                $data[$field] = $value.':00';
            }
        }

        $this->merge($data);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'class_section_id' => ['sometimes', 'required', 'integer', 'exists:class_sections,id'],
            'classroom_id' => ['sometimes', 'required', 'integer', 'exists:classrooms,id'],
            'time_slot_id' => ['sometimes', 'nullable', 'integer', 'exists:schedule_time_slots,id'],
            'day_of_week' => ['sometimes', 'required', 'integer', 'between:1,7'],
            'start_time' => ['required_without:time_slot_id', 'date_format:H:i:s'],
            'end_time' => ['required_without:time_slot_id', 'date_format:H:i:s'],
            'effective_from' => ['sometimes', 'nullable', 'date'],
            'effective_until' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ];
    }
}
