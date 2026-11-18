<?php

namespace Database\Seeders;

use App\Enums\AcademicPeriodStatus;
use App\Models\AcademicYear;
use App\Models\Semester;
use Illuminate\Database\Seeder;

class SemesterSeeder extends Seeder
{
    /** Seed two semesters in every seeded academic year with date-based statuses. */
    public function run(): void
    {
        $today = now()->toDateString();
        $years = AcademicYear::query()->orderBy('start_date')->get();

        foreach ($years as $year) {
            $startYear = (int) substr($year->name, 0, 4);
            $definitions = [
                ['name' => 'Semester 1', 'start_date' => sprintf('%04d-09-01', $startYear), 'end_date' => sprintf('%04d-12-31', $startYear)],
                ['name' => 'Semester 2', 'start_date' => sprintf('%04d-01-01', $startYear + 1), 'end_date' => sprintf('%04d-06-30', $startYear + 1)],
            ];

            foreach ($definitions as $definition) {
                $status = $today < $definition['start_date']
                    ? AcademicPeriodStatus::Upcoming
                    : ($today > $definition['end_date'] ? AcademicPeriodStatus::Completed : AcademicPeriodStatus::Active);

                Semester::updateOrCreate(
                    ['academic_year_id' => $year->id, 'name' => $definition['name']],
                    [
                        'start_date' => $definition['start_date'],
                        'end_date' => $definition['end_date'],
                        'status' => $status,
                    ],
                );
            }
        }

        $this->command?->info('Seeded two date-aligned semesters for each academic year.');
    }
}
