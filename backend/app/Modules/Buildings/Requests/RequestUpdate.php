<?php

namespace App\Modules\Buildings\Requests;

use App\Enums\ClassroomStatus;
use App\Models\Building;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestUpdate extends FormRequest
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
        $building = $this->route('building');
        $id = $building instanceof Building ? $building->id : $building;
        return [
            'code' => ['sometimes', 'required', 'string', 'max:30', Rule::unique('buildings', 'code')->ignore($id)],
            'name' => ['sometimes', 'required', 'string', 'max:150', Rule::unique('buildings', 'name')->ignore($id)],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'required', Rule::enum(ClassroomStatus::class)],
        ];
    }
}
