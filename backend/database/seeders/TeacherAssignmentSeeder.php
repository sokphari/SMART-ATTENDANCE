<?php

namespace Database\Seeders;

use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use App\Models\Semester;
use Illuminate\Database\Seeder;

class TeacherAssignmentSeeder extends Seeder
{
    /**
     * Seed 10 teacher assignments matching teachers to course sections.
     */
    public function run(): void
    {
        $mapping = [
            'TCH-0001' => 'CS-101',
            'TCH-0002' => 'IT-101',
            'TCH-0003' => 'SE-101',
            'TCH-0004' => 'EE-101',
            'TCH-0005' => 'BA-101',
            'TCH-0006' => 'AF-101',
            'TCH-0007' => 'CE-101',
            'TCH-0008' => 'ME-101',
            'TCH-0009' => 'EL-101',
            'TCH-0010' => 'MATH-101',
        ];

        $teachers = Teacher::whereIn('teacher_code', array_keys($mapping))->pluck('id', 'teacher_code');
        $courses = Course::whereIn('course_code', array_values($mapping))->pluck('id', 'course_code');
        $semester = Semester::query()->where('status', 'active')->orderBy('start_date')->first()
            ?? Semester::query()->where('status', 'upcoming')->orderBy('start_date')->first();
        if (! $semester) {
            $this->command?->error('No active or upcoming semester is available for demo teacher assignments.');
            return;
        }
        $sections = ClassSection::whereIn('course_id', $courses->values())
            ->where('semester_id', $semester->id)
            ->where('section_code', 'A')
            ->pluck('id', 'course_id');

        $count = 0;
        foreach ($mapping as $teacherCode => $courseCode) {
            $teacherId = $teachers[$teacherCode] ?? null;
            $courseId = $courses[$courseCode] ?? null;
            $sectionId = $courseId ? ($sections[$courseId] ?? null) : null;

            if (! $teacherId || ! $sectionId) {
                continue;
            }

            TeacherAssignment::updateOrCreate(
                [
                    'class_section_id' => $sectionId,
                    'teacher_id' => $teacherId,
                ],
                [
                    'assigned_at' => now(),
                ],
            );
            $count++;
        }

        $this->command?->info("Seeded {$count} teacher assignments.");
    }
}

