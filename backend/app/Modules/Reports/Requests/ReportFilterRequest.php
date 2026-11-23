<?php

namespace App\Modules\Reports\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ReportFilterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Role and teacher-module authorization is enforced by route middleware.
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'date_from' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'date_to' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'week_start' => ['sometimes', 'date_format:Y-m-d'],
            'month' => ['sometimes', 'integer', 'between:1,12'],
            'year' => ['sometimes', 'integer', 'between:2000,2100'],
            'class_section_id' => ['sometimes', 'nullable', 'integer', 'exists:class_sections,id'],
            'semester_id' => ['sometimes', 'nullable', 'integer', 'exists:semesters,id'],
            'student_id' => ['sometimes', 'nullable', 'integer', 'exists:students,id'],
            'status' => ['sometimes', 'nullable', Rule::in(['present', 'late', 'absent', 'excused', 'unrecorded'])],
            'search' => ['sometimes', 'nullable', 'string', 'max:150'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'sort_by' => ['sometimes', Rule::in(['session_date', 'student_name', 'course_code', 'attendance_status'])],
            'sort_dir' => ['sometimes', Rule::in(['asc', 'desc'])],
            'format' => ['sometimes', Rule::in(['csv', 'xlsx', 'pdf'])],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $from = $this->input('date_from');
            $to = $this->input('date_to');
            if ($from && $to && $to < $from) {
                $validator->errors()->add('date_to', 'The end date must be on or after the start date.');
            }
        });
    }
}
