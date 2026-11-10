<?php

namespace App\Modules\Courses\Requests;

use App\Enums\CourseStatus;
use App\Models\Course;
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
        $data = [];

        if ($this->has('name') && is_string($this->input('name'))) {
            $data['name'] = trim($this->input('name'));
        }

        if ($this->has('course_code') && is_string($this->input('course_code'))) {
            $data['course_code'] = strtoupper(trim($this->input('course_code')));
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
        $course = $this->route('course');
        $courseId = $course instanceof Course ? $course->getKey() : $course;

        return [
            'department_id' => ['sometimes', 'required', 'integer', 'exists:departments,id'],
            'course_code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('courses', 'course_code')->ignore($courseId),
            ],
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string'],
            'credits' => ['sometimes', 'required', 'integer', 'min:1', 'max:30'],
            'status' => ['sometimes', 'required', Rule::enum(CourseStatus::class)],
        ];
    }
}
