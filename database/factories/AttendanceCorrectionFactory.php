<?php

namespace Database\Factories;

use App\Enums\AttendanceCorrectionStatus;
use App\Enums\AttendanceStatus;
use App\Models\Attendance;
use App\Models\AttendanceCorrection;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AttendanceCorrection>
 */
class AttendanceCorrectionFactory extends Factory
{
    protected $model = AttendanceCorrection::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'attendance_id' => Attendance::factory(),
            'requested_by' => User::factory(),
            'reviewed_by' => null,
            'reason' => fake()->sentence(),
            'requested_status' => AttendanceStatus::Excused,
            'status' => AttendanceCorrectionStatus::Pending,
            'reviewed_at' => null,
            'review_note' => null,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => AttendanceCorrectionStatus::Approved,
            'reviewed_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => AttendanceCorrectionStatus::Rejected,
            'reviewed_at' => now(),
        ]);
    }
}
