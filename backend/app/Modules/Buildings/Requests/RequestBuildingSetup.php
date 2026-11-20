<?php

namespace App\Modules\Buildings\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class RequestBuildingSetup extends FormRequest
{
    public function authorize(): bool
    {
        return true; // The endpoint is protected by the existing admin role middleware.
    }

    protected function prepareForValidation(): void
    {
        $building = $this->input('building');
        $floors = $this->input('floors');

        if (is_array($building)) {
            foreach (['code', 'name'] as $field) {
                if (isset($building[$field]) && is_string($building[$field])) {
                    $building[$field] = trim($building[$field]);
                }
            }
            if (isset($building['code'])) {
                $building['code'] = strtoupper($building['code']);
            }
        }

        if (is_array($floors)) {
            foreach ($floors as &$floor) {
                if (! is_array($floor)) continue;
                if (isset($floor['name']) && is_string($floor['name'])) {
                    $floor['name'] = trim($floor['name']);
                }
                if (! isset($floor['rooms']) || ! is_array($floor['rooms'])) continue;
                foreach ($floor['rooms'] as &$room) {
                    if (! is_array($room)) continue;
                    if (isset($room['room_code']) && is_string($room['room_code'])) {
                        $room['room_code'] = strtoupper(trim($room['room_code']));
                    }
                }
                unset($room);
            }
            unset($floor);
        }

        $this->merge(['building' => $building, 'floors' => $floors]);
    }

    public function rules(): array
    {
        return [
            'building' => ['required', 'array'],
            'building.code' => ['required', 'string', 'max:30', 'unique:buildings,code'],
            'building.name' => ['required', 'string', 'max:150', 'unique:buildings,name'],
            'building.description' => ['nullable', 'string', 'max:5000'],
            'floors' => ['required', 'array', 'min:1', 'max:30'],
            'floors.*.name' => ['required', 'string', 'max:80', 'distinct:ignore_case'],
            'floors.*.floor_number' => ['required', 'integer', 'between:-2,200', 'distinct'],
            'floors.*.rooms' => ['required', 'array', 'min:1', 'max:100'],
            'floors.*.rooms.*.room_code' => ['required', 'string', 'max:50', 'unique:classrooms,room_code'],
            'floors.*.rooms.*.capacity' => ['required', 'integer', 'between:1,2000'],
            'floors.*.rooms.*.room_type' => ['required', 'in:classroom,laboratory,lecture_hall'],
            'floors.*.rooms.*.latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'floors.*.rooms.*.longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'floors.*.rooms.*.allowed_radius_meters' => ['nullable', 'integer', 'between:10,1000'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            $seenCodes = [];
            foreach ($this->input('floors', []) as $floorIndex => $floor) {
                if (! is_array($floor)) continue;
                foreach ($floor['rooms'] ?? [] as $roomIndex => $room) {
                    if (! is_array($room)) continue;
                    $prefix = "floors.{$floorIndex}.rooms.{$roomIndex}";
                    $code = strtoupper(trim((string) ($room['room_code'] ?? '')));
                    if ($code !== '' && isset($seenCodes[$code])) {
                        $validator->errors()->add("{$prefix}.room_code", 'Room codes must be unique across the university.');
                    }
                    $seenCodes[$code] = true;

                    $latitude = $room['latitude'] ?? null;
                    $longitude = $room['longitude'] ?? null;
                    $hasLatitude = $latitude !== null && $latitude !== '';
                    $hasLongitude = $longitude !== null && $longitude !== '';
                    if ($hasLatitude !== $hasLongitude) {
                        $validator->errors()->add("{$prefix}.latitude", 'Enter both GPS coordinates or leave both empty.');
                    }
                }
            }
        }];
    }
}
