<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Teacher>
 */
class TeacherFactory extends Factory
{
    protected $model = Teacher::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->state([
                'role' => UserRole::Teacher,
            ]),
            'department_id' => Department::factory(),
            'teacher_code' => strtoupper(fake()->unique()->bothify('TCH-####??')),
            'phone' => fake()->optional()->phoneNumber(),
        ];
    }
}
