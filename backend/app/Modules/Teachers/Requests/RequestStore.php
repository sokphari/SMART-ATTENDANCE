<?php

namespace App\Modules\Teachers\Requests;

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
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'string', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'status' => ['sometimes', Rule::enum(AccountStatus::class)],
            'department_id' => ['required', 'integer', 'exists:departments,id'],
            'teacher_code' => ['required', 'string', 'max:50', 'unique:teachers,teacher_code'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
        ];
    }
}
