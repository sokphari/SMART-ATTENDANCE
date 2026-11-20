<?php

namespace App\Modules\Buildings\Requests;

use App\Enums\ClassroomStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestStore extends FormRequest
{
    public function authorize(): bool { return true; }

    protected function prepareForValidation(): void
    {
        foreach (['code', 'name'] as $field) {
            if (is_string($this->input($field))) $this->merge([$field => trim($field === 'code' ? strtoupper($this->input($field)) : $this->input($field))]);
        }
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:30', 'unique:buildings,code'],
            'name' => ['required', 'string', 'max:150', 'unique:buildings,name'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', Rule::enum(ClassroomStatus::class)],
        ];
    }
}
