<?php

namespace App\Modules\Students\Requests;

use App\Enums\AccountStatus;
use App\Models\Student;
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

        if ($this->has('email') && is_string($this->input('email'))) {
            $data['email'] = strtolower(trim($this->input('email')));
        }

        if ($this->has('student_code') && is_string($this->input('student_code'))) {
            $data['student_code'] = strtoupper(trim($this->input('student_code')));
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
        $student = $this->route('student');
        $studentId = $student instanceof Student ? $student->getKey() : $student;
        $userId = $student instanceof Student ? $student->user_id : null;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'email' => [
                'sometimes',
                'required',
                'string',
                'email',
                'max:150',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'password' => ['sometimes', 'nullable', 'string', 'min:8'],
            'status' => ['sometimes', 'required', Rule::enum(AccountStatus::class)],
            'department_id' => ['sometimes', 'required', 'integer', 'exists:departments,id'],
            'student_code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('students', 'student_code')->ignore($studentId),
            ],
            'year_level' => ['sometimes', 'required', 'integer', 'between:1,10'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'gender' => ['sometimes', 'nullable', 'string', 'in:male,female,other,prefer_not_to_say'],
        ];
    }
}
