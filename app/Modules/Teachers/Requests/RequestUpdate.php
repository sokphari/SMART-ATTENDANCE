<?php

namespace App\Modules\Teachers\Requests;

use App\Enums\AccountStatus;
use App\Models\Teacher;
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

        if ($this->has('teacher_code') && is_string($this->input('teacher_code'))) {
            $data['teacher_code'] = strtoupper(trim($this->input('teacher_code')));
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
        $teacher = $this->route('teacher');
        $teacherId = $teacher instanceof Teacher ? $teacher->getKey() : $teacher;
        $userId = $teacher instanceof Teacher ? $teacher->user_id : null;

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
            'teacher_code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('teachers', 'teacher_code')->ignore($teacherId),
            ],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
        ];
    }
}
