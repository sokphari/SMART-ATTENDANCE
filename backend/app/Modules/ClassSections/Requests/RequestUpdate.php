<?php

namespace App\Modules\ClassSections\Requests;

use App\Enums\ClassSectionStatus;
use App\Models\ClassSection;
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
        $classSection = $this->route('class_section');
        $sectionId = $classSection instanceof ClassSection ? $classSection->getKey() : $classSection;
        $courseId = $this->input(
            'course_id',
            $classSection instanceof ClassSection ? $classSection->course_id : null
        );
        $semesterId = $this->input(
            'semester_id',
            $classSection instanceof ClassSection ? $classSection->semester_id : null
        );

        return [
            'course_id' => ['sometimes', 'required', 'integer', 'exists:courses,id'],
            'semester_id' => ['sometimes', 'required', 'integer', 'exists:semesters,id'],
            'section_code' => [
                'sometimes',
                'required',
                'string',
                'max:30',
                Rule::unique('class_sections', 'section_code')
                    ->where(fn ($query) => $query
                        ->where('course_id', $courseId)
                        ->where('semester_id', $semesterId))
                    ->ignore($sectionId),
            ],
            'capacity' => ['sometimes', 'required', 'integer', 'min:1', 'max:500'],
            'status' => ['sometimes', 'required', Rule::enum(ClassSectionStatus::class)],
        ];
    }
}
