<?php

namespace Database\Seeders;

use App\Enums\AcademicPeriodStatus;
use App\Models\AcademicYear;
use Illuminate\Database\Seeder;

class AcademicYearSeeder extends Seeder
{
    /**
     * Seed 10 academic years (5 completed, 1 active, 4 upcoming).
     */
    public function run(): void
    {
        $years = [
            ['name' => '2019-2020', 'start_date' => '2019-09-01', 'end_date' => '2020-06-30', 'status' => AcademicPeriodStatus::Completed],
            ['name' => '2020-2021', 'start_date' => '2020-09-01', 'end_date' => '2021-06-30', 'status' => AcademicPeriodStatus::Completed],
            ['name' => '2021-2022', 'start_date' => '2021-09-01', 'end_date' => '2022-06-30', 'status' => AcademicPeriodStatus::Completed],
            ['name' => '2022-2023', 'start_date' => '2022-09-01', 'end_date' => '2023-06-30', 'status' => AcademicPeriodStatus::Completed],
            ['name' => '2023-2024', 'start_date' => '2023-09-01', 'end_date' => '2024-06-30', 'status' => AcademicPeriodStatus::Completed],
            ['name' => '2024-2025', 'start_date' => '2024-09-01', 'end_date' => '2025-06-30', 'status' => AcademicPeriodStatus::Active],
            ['name' => '2025-2026', 'start_date' => '2025-09-01', 'end_date' => '2026-06-30', 'status' => AcademicPeriodStatus::Upcoming],
            ['name' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'status' => AcademicPeriodStatus::Upcoming],
            ['name' => '2027-2028', 'start_date' => '2027-09-01', 'end_date' => '2028-06-30', 'status' => AcademicPeriodStatus::Upcoming],
            ['name' => '2028-2029', 'start_date' => '2028-09-01', 'end_date' => '2029-06-30', 'status' => AcademicPeriodStatus::Upcoming],
        ];

        foreach ($years as $year) {
            AcademicYear::updateOrCreate(
                ['name' => $year['name']],
                [
                    'start_date' => $year['start_date'],
                    'end_date'   => $year['end_date'],
                    'status'     => $year['status'],
                ],
            );
        }

        $this->command?->info('Seeded ' . count($years) . ' academic years.');
    }
}

