<?php

namespace App\Modules\ClassSchedules\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RequestUpdateTimetableSettings extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'max_weekly_teaching_hours' => ['sometimes', 'required', 'numeric', 'gt:0', 'max:168'],
            'max_assigned_sections' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:1000'],
        ];
    }
}
