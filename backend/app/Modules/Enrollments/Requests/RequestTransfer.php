<?php

namespace App\Modules\Enrollments\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RequestTransfer extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'target_class_section_id' => ['required', 'integer', 'exists:class_sections,id'],
        ];
    }
}
