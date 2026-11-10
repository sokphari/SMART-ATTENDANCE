<?php

namespace App\Modules\AcademicYears\Requests;

use App\Enums\AcademicPeriodStatus;
use App\Models\AcademicYear;
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
        $academicYear = $this->route('academic_year');

        if ($this->has('name') && is_string($this->input('name'))) {
            $this->merge(['name' => trim($this->input('name'))]);
        }

        if (! $academicYear instanceof AcademicYear) {
            return;
        }

        if ($this->has('end_date') && ! $this->has('start_date')) {
            $this->merge(['start_date' => $academicYear->start_date?->toDateString()]);
        }

        if ($this->has('start_date') && ! $this->has('end_date')) {
            $this->merge(['end_date' => $academicYear->end_date?->toDateString()]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $academicYear = $this->route('academic_year');
        $academicYearId = $academicYear instanceof AcademicYear ? $academicYear->getKey() : $academicYear;

        return [
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:30',
                Rule::unique('academic_years', 'name')->ignore($academicYearId),
            ],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'required', 'date', 'after:start_date'],
            'status' => ['sometimes', 'required', Rule::enum(AcademicPeriodStatus::class)],
        ];
    }
}
