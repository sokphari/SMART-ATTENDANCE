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
            'status' => ['sometimes', Rule::enum(ClassSectionStatus::class)],
        ];
    }
}
