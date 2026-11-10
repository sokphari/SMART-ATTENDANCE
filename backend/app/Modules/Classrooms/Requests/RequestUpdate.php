<?php

namespace App\Modules\Classrooms\Requests;

use App\Enums\ClassroomStatus;
use App\Models\Classroom;
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
        $classroom = $this->route('classroom');
        $classroomId = $classroom instanceof Classroom ? $classroom->getKey() : $classroom;

        return [
            'room_code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('classrooms', 'room_code')->ignore($classroomId),
            ],
            'building' => ['sometimes', 'nullable', 'string', 'max:100'],
            'floor' => ['sometimes', 'nullable', 'string', 'max:20'],
            'latitude' => ['sometimes', 'required', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'required', 'numeric', 'between:-180,180'],
            'allowed_radius_meters' => ['sometimes', 'required', 'integer', 'between:10,1000'],
            'status' => ['sometimes', 'required', Rule::enum(ClassroomStatus::class)],
        ];
    }
}
