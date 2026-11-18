<?php

namespace Database\Seeders;

use App\Enums\ClassSectionStatus;
use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Semester;
use Illuminate\Database\Seeder;

class ClassSectionSeeder extends Seeder
{
    /**
     * Seed demo sections in the active semester (or nearest upcoming term).
     */
    public function run(): void
    {
        $semester = Semester::query()
            ->where('status', 'active')
            ->orderBy('start_date')
            ->first()
            ?? Semester::query()->where('status', 'upcoming')->orderBy('start_date')->first();

        if (! $semester) {
            $this->command?->error('No active or upcoming semester is available for demo sections.');
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
                    'status' => ClassSectionStatus::PendingSetup,
                ],
            );
            $count++;
        }

        $this->command?->info("Seeded {$count} class sections.");
    }
}

