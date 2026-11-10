<?php

namespace App\Modules\Semesters\Requests;

use App\Enums\AcademicPeriodStatus;
use App\Models\AcademicYear;
use App\Models\Semester;
use App\Modules\Semesters\Requests\Concerns\ValidatesSemesterDates;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class RequestUpdate extends FormRequest
{
    use ValidatesSemesterDates;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $semester = $this->route('semester');

        if ($this->has('name') && is_string($this->input('name'))) {
            $this->merge(['name' => trim($this->input('name'))]);
        }

        if (! $semester instanceof Semester) {
            return;
        }

        if ($this->has('end_date') && ! $this->has('start_date')) {
            $this->merge(['start_date' => $semester->start_date?->toDateString()]);
        }

        if ($this->has('start_date') && ! $this->has('end_date')) {
            $this->merge(['end_date' => $semester->end_date?->toDateString()]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $semester = $this->route('semester');
        $semesterId = $semester instanceof Semester ? $semester->getKey() : $semester;
        $academicYearId = $this->input(
            'academic_year_id',
            $semester instanceof Semester ? $semester->academic_year_id : null
        );

        return [
            'academic_year_id' => ['sometimes', 'required', 'integer', 'exists:academic_years,id'],
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('semesters', 'name')
                    ->where(fn ($query) => $query->where('academic_year_id', $academicYearId))
                    ->ignore($semesterId),
            ],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'required', 'date', 'after:start_date'],
            'status' => ['sometimes', 'required', Rule::enum(AcademicPeriodStatus::class)],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->hasAny(['start_date', 'end_date', 'academic_year_id'])) {
                return;
            }

            $semester = $this->route('semester');
            $academicYearId = $this->input(
                'academic_year_id',
                $semester instanceof Semester ? $semester->academic_year_id : null
            );

            $this->validateWithinAcademicYear(
                $validator,
                AcademicYear::find($academicYearId),
                $this->input('start_date', $semester instanceof Semester ? $semester->start_date?->toDateString() : null),
                $this->input('end_date', $semester instanceof Semester ? $semester->end_date?->toDateString() : null),
            );
        });
    }
}
