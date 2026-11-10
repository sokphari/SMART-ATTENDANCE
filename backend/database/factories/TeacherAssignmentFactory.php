<?php

namespace Database\Factories;

use App\Models\ClassSection;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TeacherAssignment>
 */
class TeacherAssignmentFactory extends Factory
{
    protected $model = TeacherAssignment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'class_section_id' => ClassSection::factory(),
            'teacher_id' => Teacher::factory(),
            'assigned_at' => now(),
        ];
    }
}
