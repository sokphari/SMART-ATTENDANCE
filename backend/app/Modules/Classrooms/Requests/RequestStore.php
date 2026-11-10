<?php

namespace App\Modules\Classrooms\Requests;

use App\Enums\ClassroomStatus;
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

        if ($this->has('room_code') && is_string($this->input('room_code'))) {
            $data['room_code'] = strtoupper(trim($this->input('room_code')));
        }

        if ($this->has('building') && is_string($this->input('building'))) {
            $data['building'] = trim($this->input('building'));
        }

        if ($this->has('floor') && is_string($this->input('floor'))) {
            $data['floor'] = trim($this->input('floor'));
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
            'room_code' => ['required', 'string', 'max:50', 'unique:classrooms,room_code'],
            'building' => ['sometimes', 'nullable', 'string', 'max:100'],
            'floor' => ['sometimes', 'nullable', 'string', 'max:20'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'allowed_radius_meters' => ['sometimes', 'integer', 'between:10,1000'],
            'status' => ['sometimes', Rule::enum(ClassroomStatus::class)],
        ];
    }
}
