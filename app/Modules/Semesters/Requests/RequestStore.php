<?php

namespace App\Modules\Semesters\Requests;

use App\Enums\AcademicPeriodStatus;
use App\Models\AcademicYear;
use App\Modules\Semesters\Requests\Concerns\ValidatesSemesterDates;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class RequestStore extends FormRequest
{
    use ValidatesSemesterDates;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name') && is_string($this->input('name'))) {
            $this->merge(['name' => trim($this->input('name'))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $academicYearId = $this->input('academic_year_id');

        return [
            'academic_year_id' => ['required', 'integer', 'exists:academic_years,id'],
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('semesters', 'name')
                    ->where(fn ($query) => $query->where('academic_year_id', $academicYearId)),
            ],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'status' => ['sometimes', Rule::enum(AcademicPeriodStatus::class)],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->validateWithinAcademicYear(
                $validator,
                AcademicYear::find($this->input('academic_year_id')),
                $this->input('start_date'),
                $this->input('end_date'),
            );
        });
    }
}
