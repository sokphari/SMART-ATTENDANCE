<?php

namespace Database\Factories;

use App\Enums\AcademicPeriodStatus;
use App\Models\AcademicYear;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AcademicYear>
 */
class AcademicYearFactory extends Factory
{
    protected $model = AcademicYear::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = fake()->dateTimeBetween('-3 years', '-1 year');
        $end = (clone $start)->modify('+1 year -1 day');

        return [
            'name' => fake()->unique()->numerify('20##-20##'),
            'start_date' => $start->format('Y-m-d'),
            'end_date' => $end->format('Y-m-d'),
            'status' => AcademicPeriodStatus::Upcoming,
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => AcademicPeriodStatus::Active,
        ]);
    }
}
