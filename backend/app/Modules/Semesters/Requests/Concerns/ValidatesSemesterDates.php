<?php

namespace App\Modules\Semesters\Requests\Concerns;

use App\Models\AcademicYear;
use Illuminate\Validation\Validator;

trait ValidatesSemesterDates
{
    protected function validateWithinAcademicYear(
        Validator $validator,
        ?AcademicYear $academicYear,
        ?string $startDate,
        ?string $endDate
    ): void {
        if (! $academicYear) {
            return;
        }

        $yearStart = $academicYear->start_date->toDateString();
        $yearEnd = $academicYear->end_date->toDateString();

        if ($startDate && ($startDate < $yearStart || $startDate > $yearEnd)) {
            $validator->errors()->add(
                'start_date',
                'The semester start date must be within the academic year.'
            );
        }

        if ($endDate && ($endDate < $yearStart || $endDate > $yearEnd)) {
            $validator->errors()->add(
                'end_date',
                'The semester end date must be within the academic year.'
            );
        }
    }
}
