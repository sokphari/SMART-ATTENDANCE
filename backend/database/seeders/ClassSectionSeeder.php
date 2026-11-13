<?php

namespace Database\Seeders;

use App\Enums\ClassSectionStatus;
use App\Models\AcademicYear;
use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Semester;
use Illuminate\Database\Seeder;

class ClassSectionSeeder extends Seeder
{
    /**
     * Seed 10 class sections (one per course in the active semester).
     */
    public function run(): void
    {
        $year = AcademicYear::where('name', '2024-2025')->first();
        $semester = Semester::where('academic_year_id', $year?->id)
            ->where('name', 'Semester 2')
            ->first();

        if (! $semester) {
            $this->command?->error('Active semester "Semester 2" not found.');
            return;
        }

        $courseCodes = [
            'CS-101', 'IT-101', 'SE-101', 'EE-101', 'BA-101',
            'AF-101', 'CE-101', 'ME-101', 'EL-101', 'MATH-101',
        ];

        $courses = Course::whereIn('course_code', $courseCodes)->pluck('id', 'course_code');
        $count = 0;

        foreach ($courseCodes as $code) {
            if (! isset($courses[$code])) {
                continue;
            }

            ClassSection::updateOrCreate(
                [
                    'course_id' => $courses[$code],
                    'semester_id' => $semester->id,
                    'section_code' => 'A',
                ],
                [
                    'capacity' => 35,
                    'status' => ClassSectionStatus::Active,
                ],
            );
            $count++;
        }

        $this->command?->info("Seeded {$count} class sections.");
    }
}

