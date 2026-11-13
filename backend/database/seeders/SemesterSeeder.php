<?php

namespace Database\Seeders;

use App\Enums\AcademicPeriodStatus;
use App\Models\AcademicYear;
use App\Models\Semester;
use Illuminate\Database\Seeder;

class SemesterSeeder extends Seeder
{
    /**
     * Seed semesters for the active academic year (2024-2025).
     */
    public function run(): void
    {
        $year = AcademicYear::where('name', '2024-2025')->first();

        if (! $year) {
            $year = AcademicYear::create([
                'name' => '2024-2025',
                'start_date' => '2024-09-01',
                'end_date' => '2025-06-30',
                'status' => AcademicPeriodStatus::Active,
            ]);
        }

        $semesters = [
            [
                'name' => 'Semester 1',
                'start_date' => '2024-09-01',
                'end_date' => '2024-12-31',
                'status' => AcademicPeriodStatus::Completed,
            ],
            [
                'name' => 'Semester 2',
                'start_date' => '2025-01-01',
                'end_date' => '2025-06-30',
                'status' => AcademicPeriodStatus::Active,
            ],
        ];

        foreach ($semesters as $data) {
            Semester::updateOrCreate(
                [
                    'academic_year_id' => $year->id,
                    'name' => $data['name'],
                ],
                [
                    'start_date' => $data['start_date'],
                    'end_date' => $data['end_date'],
                    'status' => $data['status'],
                ],
            );
        }

        $this->command?->info('Seeded ' . count($semesters) . ' semesters for academic year ' . $year->name);
    }
}

