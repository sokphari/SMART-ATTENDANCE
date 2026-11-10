<?php

namespace Database\Factories;

use App\Enums\CourseStatus;
use App\Models\Course;
use App\Models\Department;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Course>
 */
class CourseFactory extends Factory
{
    protected $model = Course::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'department_id' => Department::factory(),
            'course_code' => strtoupper(fake()->unique()->bothify('CRS-####')),
            'name' => fake()->unique()->words(3, true),
            'description' => fake()->optional()->sentence(),
            'credits' => fake()->numberBetween(1, 6),
            'status' => CourseStatus::Active,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => CourseStatus::Inactive,
        ]);
    }
}
