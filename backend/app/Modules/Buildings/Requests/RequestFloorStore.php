<?php

namespace App\Modules\Buildings\Requests;

use App\Enums\ClassroomStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestFloorStore extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'floor_number' => ['sometimes', 'nullable', 'integer', 'between:-2,200'],
            'name' => ['required', 'string', 'max:80'],
            'status' => ['sometimes', Rule::enum(ClassroomStatus::class)],
        ];
    }
}
