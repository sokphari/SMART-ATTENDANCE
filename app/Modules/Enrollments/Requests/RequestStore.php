<?php

namespace App\Modules\Enrollments\Requests;

use App\Enums\AccountStatus;
use App\Enums\EnrollmentStatus;
use App\Models\ClassSection;
use App\Models\Enrollment;
use App\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class RequestStore extends FormRequest
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
            'class_section_id' => ['required', 'integer', 'exists:class_sections,id'],
            'student_id' => [
                'required',
                'integer',
                'exists:students,id',
                Rule::unique('enrollments', 'student_id')
                    ->where(fn ($query) => $query->where('class_section_id', $this->input('class_section_id'))),
            ],
            'enrollment_date' => ['sometimes', 'date'],
            'status' => ['sometimes', Rule::enum(EnrollmentStatus::class)],
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

                $classSection = ClassSection::find($this->input('class_section_id'));

                if ($classSection !== null && ! $classSection->isActive()) {
                    $validator->errors()->add(
                        'class_section_id',
                        'The selected class section is not active.'
                    );
                }

                $student = Student::with('user')->find($this->input('student_id'));

                if ($student !== null && $student->user?->status !== AccountStatus::Active) {
                    $validator->errors()->add(
                        'student_id',
                        'The selected student account is not active.'
                    );
                }

                if ($classSection === null) {
                    return;
                }

                $enrolled = Enrollment::query()
                    ->where('class_section_id', $classSection->id)
                    ->where('status', EnrollmentStatus::Enrolled->value)
                    ->count();

                if ($enrolled >= $classSection->capacity) {
                    $validator->errors()->add(
                        'class_section_id',
                        'The selected class section has reached its capacity.'
                    );
                }
            },
        ];
    }
}
