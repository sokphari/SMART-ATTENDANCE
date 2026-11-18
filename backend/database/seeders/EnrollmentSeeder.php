<?php

namespace Database\Seeders;

use App\Enums\EnrollmentStatus;
use App\Enums\ClassSectionStatus;
use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\Semester;
use Illuminate\Database\Seeder;

class EnrollmentSeeder extends Seeder
{
    /**
     * Seed enrollments: all students in CS-101, plus each student in their department section.
     */
    public function run(): void
    {
        $courses = Course::pluck('id', 'course_code');
        $semester = Semester::query()->where('status', 'active')->orderBy('start_date')->first()
            ?? Semester::query()->where('status', 'upcoming')->orderBy('start_date')->first();
        if (! $semester) {
            $this->command?->error('No active or upcoming semester is available for demo enrollments.');
            return;
        }
        $sections = ClassSection::where('semester_id', $semester->id)
            ->where('status', ClassSectionStatus::Active->value)
            ->where('section_code', 'A')
            ->pluck('id', 'course_id');
        $students = Student::pluck('id', 'student_code');

        $deptCourseMap = [
            'STU-0001' => 'CS-101',
            'STU-0002' => 'IT-101',
            'STU-0003' => 'SE-101',
            'STU-0004' => 'EE-101',
            'STU-0005' => 'BA-101',
            'STU-0006' => 'AF-101',
            'STU-0007' => 'CE-101',
            'STU-0008' => 'ME-101',
            'STU-0009' => 'EL-101',
            'STU-0010' => 'MATH-101',
        ];

        $csCourseId = $courses['CS-101'] ?? null;
        $csSectionId = $csCourseId ? ($sections[$csCourseId] ?? null) : null;

        $count = 0;

        foreach ($students as $studentCode => $studentId) {
            // 1. Enroll everyone in CS-101
            if ($csSectionId) {
                Enrollment::updateOrCreate(
                    [
                        'class_section_id' => $csSectionId,
                        'student_id' => $studentId,
                    ],
                    [
                        'enrollment_date' => now()->toDateString(),
                        'status' => EnrollmentStatus::Enrolled,
                    ],
                );
                $count++;
            }

            // 2. Enroll in their department course
            $deptCourseCode = $deptCourseMap[$studentCode] ?? null;
            if ($deptCourseCode && $deptCourseCode !== 'CS-101') {
                $deptCourseId = $courses[$deptCourseCode] ?? null;
                $deptSectionId = $deptCourseId ? ($sections[$deptCourseId] ?? null) : null;

                if ($deptSectionId) {
                    Enrollment::updateOrCreate(
                        [
                            'class_section_id' => $deptSectionId,
                            'student_id' => $studentId,
                        ],
                        [
                            'enrollment_date' => now()->toDateString(),
                            'status' => EnrollmentStatus::Enrolled,
                        ],
                    );
                    $count++;
                }
            }
        }

        $this->command?->info("Seeded {$count} enrollments.");
    }
}

