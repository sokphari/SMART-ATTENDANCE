<?php

namespace Database\Seeders;

use App\Enums\AcademicPeriodStatus;
use App\Models\AcademicYear;
use Illuminate\Database\Seeder;

class AcademicYearSeeder extends Seeder
{
    /** Seed only the current academic year used for a fresh demo database. */
    public function run(): void
    {
        $today = now()->toDateString();
        $calendarYear = (int) now()->format('Y');
        $month = (int) now()->format('n');
        // The academic year begins in September. During July/August, seed the
        // next upcoming year; from September through June use its current year.
        $startYear = $month >= 7 ? $calendarYear : $calendarYear - 1;
        $year = [
            'name' => sprintf('%d-%d', $startYear, $startYear + 1),
            'start_date' => sprintf('%04d-09-01', $startYear),
            'end_date' => sprintf('%04d-06-30', $startYear + 1),
        ];
        $status = $today < $year['start_date']
            ? AcademicPeriodStatus::Upcoming
            : ($today > $year['end_date'] ? AcademicPeriodStatus::Completed : AcademicPeriodStatus::Active);

        AcademicYear::updateOrCreate(
            ['name' => $year['name']],
            [
                'start_date' => $year['start_date'],
                'end_date' => $year['end_date'],
                'status' => $status,
            ],
        );

        $this->command?->info('Seeded the current academic year: ' . $year['name'] . '.');
    }
}

