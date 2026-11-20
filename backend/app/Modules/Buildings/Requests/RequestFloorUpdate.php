<?php

namespace App\Modules\Buildings\Requests;

use App\Enums\ClassroomStatus;
use App\Models\Floor;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestFloorUpdate extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $floor = $this->route('floor');
        $id = $floor instanceof Floor ? $floor->id : $floor;
        $buildingId = $floor instanceof Floor ? $floor->building_id : null;
        return [
            'floor_number' => ['sometimes', 'nullable', 'integer', 'between:-2,200'],
            'name' => ['sometimes', 'required', 'string', 'max:80', Rule::unique('floors', 'name')->where('building_id', $buildingId)->ignore($id)],
            'status' => ['sometimes', 'required', Rule::enum(ClassroomStatus::class)],
        ];
    }
}
