<?php

namespace App\Modules\Enrollments\Requests;

use App\Enums\EnrollmentStatus;
use App\Models\ClassSection;
use App\Models\Enrollment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class RequestUpdate extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'enrollment_date' => ['sometimes', 'date'],
            'status' => ['sometimes', 'required', Rule::enum(EnrollmentStatus::class)],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $enrollment = $this->route('enrollment');

                if (! $enrollment instanceof Enrollment) {
                    return;
                }

                $status = $this->input('status', $enrollment->status?->value);

                if ($status !== EnrollmentStatus::Enrolled->value) {
                    return;
                }

                if ($enrollment->status === EnrollmentStatus::Enrolled) {
                    return;
                }

                $classSection = ClassSection::find($enrollment->class_section_id);

                if ($classSection === null) {
                    return;
                }

                $enrolled = Enrollment::query()
                    ->where('class_section_id', $classSection->id)
                    ->where('status', EnrollmentStatus::Enrolled->value)
                    ->whereKeyNot($enrollment->getKey())
                    ->count();

                if ($enrolled >= $classSection->capacity) {
                    $validator->errors()->add(
                        'status',
                        'The selected class section has reached its capacity.'
                    );
                }
            },
        ];
    }
}
