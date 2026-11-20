<?php

namespace App\Modules\ClassSections\Requests;

use App\Enums\ClassSectionStatus;
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
        if ($this->has('section_code') && is_string($this->input('section_code'))) {
            $this->merge([
                'section_code' => strtoupper(trim($this->input('section_code'))),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $courseId = $this->input('course_id');
        $semesterId = $this->input('semester_id');

        return [
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'semester_id' => ['required', 'integer', 'exists:semesters,id'],
            'section_code' => [
                'required',
                'string',
                'max:30',
                Rule::unique('class_sections', 'section_code')
                    ->where(fn ($query) => $query
                        ->where('course_id', $courseId)
                        ->where('semester_id', $semesterId)),
            ],
            'capacity' => ['required', 'integer', 'min:1', 'max:500'],
            'program_id' => ['sometimes', 'nullable', 'integer', 'exists:programs,id'],
            'year_level' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:20'],
            'class_start_date' => ['sometimes', 'nullable', 'date'],
            'class_end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:class_start_date'],
            'teacher_id' => ['sometimes', 'integer', 'exists:teachers,id'],
            'schedules' => ['sometimes', 'array', 'min:1'],
            'schedules.*.classroom_id' => ['required_with:schedules', 'integer', 'exists:classrooms,id'],
            'schedules.*.day_of_week' => ['required_with:schedules', 'integer', 'between:1,7'],
            'schedules.*.start_time' => ['required_with:schedules', 'date_format:H:i'],
            'schedules.*.end_time' => ['required_with:schedules', 'date_format:H:i', 'after:schedules.*.start_time'],
            'schedules.*.effective_from' => ['sometimes', 'nullable', 'date'],
            'schedules.*.effective_until' => ['sometimes', 'nullable', 'date', 'after_or_equal:schedules.*.effective_from'],
            'status' => ['sometimes', Rule::enum(ClassSectionStatus::class)],
        ];
    }
}
