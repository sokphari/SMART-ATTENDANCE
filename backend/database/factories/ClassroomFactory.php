<?php

namespace Database\Factories;

use App\Enums\ClassroomStatus;
use App\Models\Classroom;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Classroom>
 */
class ClassroomFactory extends Factory
{
    protected $model = Classroom::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'room_code' => strtoupper(fake()->unique()->bothify('RM-###')),
            'building' => fake()->randomElement(['Building A', 'Building B', 'Building C']),
            'floor' => (string) fake()->numberBetween(1, 5),
            'latitude' => fake()->latitude(11.5, 11.6),
            'longitude' => fake()->longitude(104.85, 104.95),
            'allowed_radius_meters' => fake()->numberBetween(10, 1000),
            'status' => ClassroomStatus::Active,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ClassroomStatus::Inactive,
        ]);
    }
}
