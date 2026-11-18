<?php

namespace App\Modules\ClassSchedules\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RequestUpdateTimeSlot extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        foreach (['starts_at', 'ends_at'] as $field) {
            $value = $this->input($field);
            if (is_string($value) && preg_match('/^\d{2}:\d{2}$/', $value) === 1) {
                $this->merge([$field => $value.':00']);
            }
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'starts_at' => ['sometimes', 'required', 'date_format:H:i:s'],
            'ends_at' => ['sometimes', 'required', 'date_format:H:i:s'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
