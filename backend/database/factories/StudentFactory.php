<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Student>
 */
class StudentFactory extends Factory
{
    protected $model = Student::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->state([
                'role' => UserRole::Student,
            ]),
            'department_id' => Department::factory(),
            'student_code' => strtoupper(fake()->unique()->bothify('STU-####??')),
            'year_level' => fake()->numberBetween(1, 5),
            'phone' => fake()->optional()->phoneNumber(),
        ];
    }
}
