<?php

namespace Database\Factories;

use App\Enums\EnrollmentStatus;
use App\Models\ClassSection;
use App\Models\Enrollment;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Enrollment>
 */
class EnrollmentFactory extends Factory
{
    protected $model = Enrollment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'class_section_id' => ClassSection::factory(),
            'student_id' => Student::factory(),
            'enrollment_date' => now()->toDateString(),
            'status' => EnrollmentStatus::Enrolled,
        ];
    }

    public function dropped(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => EnrollmentStatus::Dropped,
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => EnrollmentStatus::Completed,
        ]);
    }
}
