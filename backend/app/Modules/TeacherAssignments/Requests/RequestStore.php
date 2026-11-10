<?php

namespace App\Modules\TeacherAssignments\Requests;

use App\Enums\AccountStatus;
use App\Models\ClassSection;
use App\Models\Teacher;
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
            'teacher_id' => [
                'required',
                'integer',
                'exists:teachers,id',
                Rule::unique('teacher_assignments', 'teacher_id')
                    ->where(fn ($query) => $query->where('class_section_id', $this->input('class_section_id'))),
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

                $classSection = ClassSection::find($this->input('class_section_id'));

                if ($classSection !== null && ! $classSection->isActive()) {
                    $validator->errors()->add(
                        'class_section_id',
                        'The selected class section is not active.'
                    );
                }

                $teacher = Teacher::with('user')->find($this->input('teacher_id'));

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
