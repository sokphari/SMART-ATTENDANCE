<?php

namespace Database\Factories;

use App\Enums\ClassSectionStatus;
use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Semester;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ClassSection>
 */
class ClassSectionFactory extends Factory
{
    protected $model = ClassSection::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'semester_id' => Semester::factory(),
            'section_code' => strtoupper(fake()->unique()->bothify('SEC-##')),
            'capacity' => fake()->numberBetween(20, 60),
            'status' => ClassSectionStatus::Active,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ClassSectionStatus::Inactive,
        ]);
    }
}
