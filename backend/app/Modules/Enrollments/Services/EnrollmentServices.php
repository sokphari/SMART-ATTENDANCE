<?php

namespace App\Modules\Enrollments\Services;

use App\Enums\EnrollmentStatus;
use App\Enums\ClassSectionStatus;
use App\Models\ClassSection;
use App\Models\Enrollment;
use App\Modules\AuditLogs\Services\AuditLogServices;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EnrollmentServices
{
    public function __construct(private readonly AuditLogServices $auditLogs) {}

    /**
     * @param  array{search?: string|null, class_section_id?: int|string|null, student_id?: int|string|null, status?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return Enrollment::query()
            ->with([
                'classSection.course.department',
                'classSection.semester',
                'student.user',
                'student.department',
            ])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $term = '%'.strtolower($search).'%';

                $query->whereHas('student', function ($query) use ($term): void {
                    $query->whereRaw('LOWER(student_code) LIKE ?', [$term])
                        ->orWhereHas('user', function ($query) use ($term): void {
                            $query->whereRaw('LOWER(name) LIKE ?', [$term])
                                ->orWhereRaw('LOWER(email) LIKE ?', [$term]);
                        });
                });
            })
            ->when(
                $filters['class_section_id'] ?? null,
                fn ($query, $classSectionId) => $query->where('class_section_id', $classSectionId)
            )
            ->when(
                $filters['student_id'] ?? null,
                fn ($query, $studentId) => $query->where('student_id', $studentId)
            )
            ->when(
                $filters['status'] ?? null,
                fn ($query, string $status) => $query->where('status', $status)
            )
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Enrollment
    {
        $enrollment = DB::transaction(function () use ($data): Enrollment {
            $section = ClassSection::query()->whereKey($data['class_section_id'])->lockForUpdate()->firstOrFail();
            if ($section->resultPublication()->whereIn('status', ['approved', 'published'])->exists()) {
                throw ValidationException::withMessages(['class_section_id' => ['Enrollment is locked because semester results have been approved.']]);
            }
            $status = $data['status'] ?? EnrollmentStatus::Enrolled->value;

            if ($status === EnrollmentStatus::Enrolled->value) {
                $student = \App\Models\Student::query()->with('program')->findOrFail($data['student_id']);
                $course = $section->course()->firstOrFail();
                if ((int) $student->department_id !== (int) $course->department_id || ($section->program_id && (int) $student->program_id !== (int) $section->program_id) || ($section->year_level && (int) $student->year_level !== (int) $section->year_level)) {
                    throw ValidationException::withMessages(['student_id' => ['This student does not match the department, program, or year level for the selected subject offering.']]);
                }
                $policy = \App\Models\GradePolicy::query()->firstOrCreate(['semester_id' => $section->semester_id], ['max_subject_offerings' => 5]);
                $alreadyHasCourse = Enrollment::query()->where('student_id', $student->id)->where('status', EnrollmentStatus::Enrolled->value)
                    ->whereHas('classSection', fn ($q) => $q->where('semester_id', $section->semester_id)->where('course_id', $section->course_id))->exists();
                $sameCourseInAnotherSection = Enrollment::query()->where('student_id', $student->id)->where('status', EnrollmentStatus::Enrolled->value)
                    ->where('class_section_id', '!=', $section->id)
                    ->whereHas('classSection', fn ($q) => $q->where('semester_id', $section->semester_id)->where('course_id', $section->course_id))->exists();
                if ($sameCourseInAnotherSection) {
                    throw ValidationException::withMessages(['class_section_id' => ['The student is already enrolled in another section of this subject. Switch the existing enrollment instead.']]);
                }
                $offeringCount = $student->enrollments()->where('status', EnrollmentStatus::Enrolled->value)
                    ->whereHas('classSection', fn ($q) => $q->where('semester_id', $section->semester_id))
                    ->with('classSection:id,course_id,semester_id')
                    ->get()->pluck('classSection.course_id')->filter()->unique()->count();
                if (! $alreadyHasCourse && $offeringCount >= $policy->max_subject_offerings) {
                    throw ValidationException::withMessages(['student_id' => ["A student may enroll in at most {$policy->max_subject_offerings} subject offerings this semester."]]);
                }
                $alreadyEnrolled = Enrollment::query()
                    ->where('class_section_id', $section->id)
                    ->where('student_id', $data['student_id'])
                    ->where('status', EnrollmentStatus::Enrolled->value)
                    ->exists();
                $enrolledCount = Enrollment::query()
                    ->where('class_section_id', $section->id)
                    ->where('status', EnrollmentStatus::Enrolled->value)
                    ->count();

                if (! $alreadyEnrolled && $enrolledCount >= $section->capacity) {
                    throw ValidationException::withMessages([
                        'class_section_id' => ['This class section has reached its enrollment capacity.'],
                    ]);
                }
            }

            return Enrollment::create([
                'class_section_id' => $section->id,
                'student_id' => $data['student_id'],
                'enrollment_date' => $data['enrollment_date'] ?? now()->toDateString(),
                'status' => $status,
            ]);
        });

        return $enrollment->load($this->relations());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Enrollment $enrollment, array $data): Enrollment
    {
        $enrollment->fill($data);
        $enrollment->save();

        return $enrollment->refresh()->load($this->relations());
    }

    public function transfer(Enrollment $enrollment, int $targetSectionId): Enrollment
    {
        return DB::transaction(function () use ($enrollment, $targetSectionId): Enrollment {
            $current = Enrollment::query()->whereKey($enrollment->id)->lockForUpdate()->firstOrFail();
            if ($current->status !== EnrollmentStatus::Enrolled) {
                throw ValidationException::withMessages(['enrollment' => ['Only a currently enrolled student can be switched to another class.']]);
            }

            $target = ClassSection::query()->whereKey($targetSectionId)->lockForUpdate()->firstOrFail();
            $source = ClassSection::query()->findOrFail($current->class_section_id);
            if ($source->resultPublication()->whereIn('status', ['approved', 'published'])->exists() || $target->resultPublication()->whereIn('status', ['approved', 'published'])->exists()) {
                throw ValidationException::withMessages(['target_class_section_id' => ['Student transfers are locked because semester results have been approved.']]);
            }
            if ($target->id === $source->id) {
                throw ValidationException::withMessages(['target_class_section_id' => ['Choose a different class section.']]);
            }
            if ($target->status !== ClassSectionStatus::Active) {
                throw ValidationException::withMessages(['target_class_section_id' => ['Choose an active class section.']]);
            }
            if ($target->course_id !== $source->course_id || $target->semester_id !== $source->semester_id) {
                throw ValidationException::withMessages(['target_class_section_id' => ['Students can only switch between sections of the same course and semester.']]);
            }
            $student = \App\Models\Student::query()->findOrFail($current->student_id);
            $course = $target->course()->firstOrFail();
            if ((int) $student->department_id !== (int) $course->department_id || ($target->program_id && (int) $student->program_id !== (int) $target->program_id) || ($target->year_level && (int) $student->year_level !== (int) $target->year_level)) {
                throw ValidationException::withMessages(['target_class_section_id' => ['The target class does not match the student department, program, or year level.']]);
            }

            $existingTarget = Enrollment::query()
                ->where('student_id', $current->student_id)
                ->where('class_section_id', $target->id)
                ->lockForUpdate()
                ->first();
            if ($existingTarget?->status === EnrollmentStatus::Enrolled) {
                throw ValidationException::withMessages(['target_class_section_id' => ['The student is already enrolled in that class section.']]);
            }
            if ($existingTarget?->status === EnrollmentStatus::Completed) {
                throw ValidationException::withMessages(['target_class_section_id' => ['The student has already completed that class section.']]);
            }

            $enrolledCount = Enrollment::query()
                ->where('class_section_id', $target->id)
                ->where('status', EnrollmentStatus::Enrolled->value)
                ->count();
            if ($enrolledCount >= $target->capacity) {
                throw ValidationException::withMessages(['target_class_section_id' => ['The selected class section has reached its capacity.']]);
            }

            $fromSectionId = $current->class_section_id;
            $current->update(['status' => EnrollmentStatus::Dropped->value]);
            if ($existingTarget) {
                $existingTarget->update([
                    'status' => EnrollmentStatus::Enrolled->value,
                    'enrollment_date' => now()->toDateString(),
                ]);
                $transferred = $existingTarget;
            } else {
                $transferred = Enrollment::create([
                    'student_id' => $current->student_id,
                    'class_section_id' => $target->id,
                    'enrollment_date' => now()->toDateString(),
                    'status' => EnrollmentStatus::Enrolled->value,
                ]);
            }

            $this->auditLogs->record(
                'student.class_switched',
                'enrollment',
                $transferred->id,
                ['enrollment_id' => $current->id, 'class_section_id' => $fromSectionId],
                ['enrollment_id' => $transferred->id, 'class_section_id' => $target->id, 'student_id' => $current->student_id]
            );

            return $transferred->refresh()->load($this->relations());
        }, 3);
    }

    public function withdraw(Enrollment $enrollment): void
    {
        $enrollment->update(['status' => EnrollmentStatus::Dropped->value]);
    }

    /**
     * @return list<string>
     */
    private function relations(): array
    {
        return [
            'classSection.course.department',
            'classSection.semester',
            'student.user',
            'student.department',
        ];
    }
}
