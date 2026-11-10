<?php

namespace Database\Factories;

use App\Enums\AcademicPeriodStatus;
use App\Models\AcademicYear;
use App\Models\Semester;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Semester>
 */
class SemesterFactory extends Factory
{
    protected $model = Semester::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'academic_year_id' => AcademicYear::factory(),
            'name' => fake()->unique()->words(2, true),
            'start_date' => '2025-01-15',
            'end_date' => '2025-06-30',
            'status' => AcademicPeriodStatus::Upcoming,
        ];
    }
}
