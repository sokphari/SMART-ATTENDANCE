<?php

namespace App\Modules\Students\Requests;

use App\Enums\AccountStatus;
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
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'string', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'status' => ['sometimes', Rule::enum(AccountStatus::class)],
            'department_id' => ['required', 'integer', 'exists:departments,id'],
            'student_code' => ['required', 'string', 'max:50', 'unique:students,student_code'],
            'year_level' => ['required', 'integer', 'between:1,10'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
        ];
    }
}
