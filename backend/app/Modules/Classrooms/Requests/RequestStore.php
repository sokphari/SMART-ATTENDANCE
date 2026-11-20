<?php

namespace App\Modules\Classrooms\Requests;

use App\Enums\ClassroomStatus;
use App\Models\Floor;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
            'floor_id' => ['sometimes', 'nullable', 'integer', 'exists:floors,id'],
            'capacity' => ['sometimes', 'integer', 'between:1,2000'],
            'room_type' => ['sometimes', 'string', 'max:50'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'allowed_radius_meters' => ['sometimes', 'integer', 'between:10,1000'],
            'status' => ['sometimes', Rule::enum(ClassroomStatus::class)],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty() || ! $this->filled('floor_id')) return;
            $floor = Floor::query()->with('building')->find($this->integer('floor_id'));
            if (! $floor?->isActive() || ! $floor->building?->isActive()) {
                $validator->errors()->add('floor_id', 'Choose a floor in an active building.');
            }
        }];
    }
}
