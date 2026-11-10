<?php

namespace Database\Factories;

use App\Enums\AttendanceSessionStatus;
use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\ClassSection;
use App\Models\Teacher;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AttendanceSession>
 */
class AttendanceSessionFactory extends Factory
{
    protected $model = AttendanceSession::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'class_section_id' => ClassSection::factory(),
            'class_schedule_id' => null,
            'teacher_id' => Teacher::factory(),
            'classroom_id' => Classroom::factory(),
            'session_date' => now()->toDateString(),
            'starts_at' => now()->subMinutes(5),
            'late_after' => now()->addMinutes(10),
            'closes_at' => now()->addHour(),
            'closed_at' => null,
            'status' => AttendanceSessionStatus::Open,
            'allowed_latitude' => 11.5564,
            'allowed_longitude' => 104.9282,
            'allowed_radius_meters' => 100,
        ];
    }

    public function scheduled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => AttendanceSessionStatus::Scheduled,
        ]);
    }

    public function closed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => AttendanceSessionStatus::Closed,
            'closed_at' => now(),
        ]);
    }
}
