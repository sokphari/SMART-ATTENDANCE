<?php

namespace App\Modules\TeacherAssignments\Requests;

use App\Enums\AccountStatus;
use App\Models\ClassSection;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
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
        $assignment = $this->route('teacher_assignment');
        $assignmentId = $assignment instanceof TeacherAssignment ? $assignment->getKey() : $assignment;
        $classSectionId = $this->input(
            'class_section_id',
            $assignment instanceof TeacherAssignment ? $assignment->class_section_id : null
        );

        return [
            'class_section_id' => ['sometimes', 'required', 'integer', 'exists:class_sections,id'],
            'teacher_id' => [
                'sometimes',
                'required',
                'integer',
                'exists:teachers,id',
                Rule::unique('teacher_assignments', 'teacher_id')
                    ->where(fn ($query) => $query->where('class_section_id', $classSectionId))
                    ->ignore($assignmentId),
            ],
            'assigned_at' => ['sometimes', 'date'],
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

                $assignment = $this->route('teacher_assignment');

                if (! $assignment instanceof TeacherAssignment) {
                    return;
                }

                $classSectionId = $this->input('class_section_id', $assignment->class_section_id);
                $classSection = ClassSection::find($classSectionId);

                if ($classSection !== null && ! $classSection->isActive()) {
                    $validator->errors()->add(
                        'class_section_id',
                        'The selected class section is not active.'
                    );
                }

                $teacherId = $this->input('teacher_id', $assignment->teacher_id);
                $teacher = Teacher::with('user')->find($teacherId);

                if ($teacher !== null && $teacher->user?->status !== AccountStatus::Active) {
                    $validator->errors()->add(
                        'teacher_id',
                        'The selected teacher account is not active.'
                    );
                }
            },
        ];
    }
}
