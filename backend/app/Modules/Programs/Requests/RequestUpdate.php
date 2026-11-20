<?php

namespace App\Modules\Programs\Requests;

use App\Enums\DepartmentStatus;
use App\Models\Program;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestUpdate extends FormRequest
{
    public function authorize(): bool { return true; }

    protected function prepareForValidation(): void
    {
        foreach (['code', 'name'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => trim($field === 'code' ? strtoupper($this->input($field)) : $this->input($field))]);
            }
        }
    }

    public function rules(): array
    {
        $program = $this->route('program');
        $id = $program instanceof Program ? $program->id : $program;

        return [
            'department_id' => ['sometimes', 'required', 'integer', 'exists:departments,id'],
            'code' => ['sometimes', 'required', 'string', 'max:40', Rule::unique('programs', 'code')->ignore($id)],
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'required', Rule::enum(DepartmentStatus::class)],
        ];
    }
}
