<?php

namespace App\Modules\Students\Services;

use App\Enums\AcademicPeriodStatus;
use App\Enums\ClassSectionStatus;
use App\Enums\CourseStatus;
use App\Enums\EnrollmentStatus;
use App\Models\AcademicYear;
use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrollment;
use App\Models\Semester;
use App\Models\Student;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class StudentClassAllocationService
{
    /**
     * Allocates one active student to one class in the explicitly active term.
     * The caller must hold a lock on the student's department row.
     *
     * @return array{enrollment: Enrollment, section: ClassSection, created_section: bool}
     */
    public function allocate(Student $student, Department $department): array
    {
        $year = AcademicYear::query()
            ->where('status', AcademicPeriodStatus::Active->value)
            ->lockForUpdate()
            ->get();

        if ($year->count() !== 1) {
            throw ValidationException::withMessages([
                'academic_period' => ['Set exactly one academic year to Active before registering students.'],
            ]);
        }

        $semesters = Semester::query()
            ->where('academic_year_id', $year->first()->id)
            ->where('status', AcademicPeriodStatus::Active->value)
            ->lockForUpdate()
            ->get();

        if ($semesters->count() !== 1) {
            throw ValidationException::withMessages([
                'academic_period' => ['Set exactly one semester in the active academic year to Active before registering students.'],
            ]);
        }

        $semester = $semesters->first();
        $courses = Course::query()
            ->where('department_id', $department->id)
            ->where('status', CourseStatus::Active->value)
            ->orderBy('id')
            ->get(['id']);

        if ($courses->isEmpty()) {
            throw ValidationException::withMessages([
                'department_id' => ['This department has no active courses to allocate the student to.'],
            ]);
        }

        $sections = ClassSection::query()
            ->whereIn('course_id', $courses->modelKeys())
            ->where('semester_id', $semester->id)
            ->where('status', ClassSectionStatus::Active->value)
            ->orderBy('course_id')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        if ($sections->isEmpty()) {
            throw ValidationException::withMessages([
                'department_id' => ['No active class sections exist for this department in the active semester. Configure a section before registering students.'],
            ]);
        }

        $enrolledCounts = Enrollment::query()
            ->selectRaw('class_section_id, COUNT(*) AS enrolled_count')
            ->whereIn('class_section_id', $sections->modelKeys())
            ->where('status', EnrollmentStatus::Enrolled->value)
            ->groupBy('class_section_id')
            ->pluck('enrolled_count', 'class_section_id');

        $available = $sections
            ->filter(fn (ClassSection $section): bool => (int) ($enrolledCounts[$section->id] ?? 0) < $section->capacity)
            ->sort(function (ClassSection $left, ClassSection $right) use ($enrolledCounts): int {
                return [(int) ($enrolledCounts[$left->id] ?? 0), $left->id]
                    <=> [(int) ($enrolledCounts[$right->id] ?? 0), $right->id];
            })
            ->first();

        $createdSection = false;
        if ($available instanceof ClassSection) {
            $section = $available;
        } else {
            $courseId = $sections->first()->course_id;
            $courseSections = ClassSection::query()
                ->where('course_id', $courseId)
                ->where('semester_id', $semester->id)
                ->lockForUpdate()
                ->get(['section_code']);

            $section = ClassSection::create([
                'course_id' => $courseId,
                'semester_id' => $semester->id,
                'section_code' => $this->nextSectionCode($courseSections),
                'capacity' => max(1, (int) config('student_registration.section_capacity', 35)),
                'status' => ClassSectionStatus::PendingSetup->value,
            ]);
            $createdSection = true;
        }

        $enrollment = Enrollment::create([
            'class_section_id' => $section->id,
            'student_id' => $student->id,
            'enrollment_date' => now()->toDateString(),
            'status' => EnrollmentStatus::Enrolled->value,
        ]);

        return [
            'enrollment' => $enrollment->load(['classSection.course.department', 'classSection.semester.academicYear']),
            'section' => $section->load(['course.department', 'semester.academicYear']),
            'created_section' => $createdSection,
        ];
    }

    /** @param Collection<int, ClassSection> $sections */
    private function nextSectionCode(Collection $sections): string
    {
        $codes = $sections->pluck('section_code')->map(fn ($code): string => strtoupper((string) $code))->all();
        $alphabetic = count(array_filter($codes, fn (string $code): bool => preg_match('/^[A-Z]{1,3}$/', $code) === 1)) === count($codes);

        if ($alphabetic) {
            for ($index = 1; $index <= 18278; $index++) {
                $candidate = $this->alphabeticCode($index);
                if (! in_array($candidate, $codes, true)) {
                    return $candidate;
                }
            }
        }

        $numericPatterns = [];
        foreach ($codes as $code) {
            if (preg_match('/^(.*?)(\d+)$/', $code, $matches) === 1) {
                $numericPatterns[$matches[1]][] = (int) $matches[2];
            }
        }

        if (count($numericPatterns) === 1) {
            $prefix = (string) array_key_first($numericPatterns);
            $numbers = reset($numericPatterns);
            $width = max(array_map(fn (string $code): int => strlen((string) preg_replace('/^.*?(\d+)$/', '$1', $code)), $codes));
            return $prefix.str_pad((string) (max($numbers) + 1), $width, '0', STR_PAD_LEFT);
        }

        for ($index = 1; $index <= 18278; $index++) {
            $candidate = $this->alphabeticCode($index);
            if (! in_array($candidate, $codes, true)) {
                return $candidate;
            }
        }

        throw ValidationException::withMessages([
            'class_section' => ['A unique section code could not be generated. Please configure the new section manually.'],
        ]);
    }

    private function alphabeticCode(int $number): string
    {
        $code = '';
        while ($number > 0) {
            $number--;
            $code = chr(65 + ($number % 26)).$code;
            $number = intdiv($number, 26);
        }

        return $code;
    }
}
