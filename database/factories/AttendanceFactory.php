<?php

namespace Database\Factories;

use App\Enums\AttendanceStatus;
use App\Enums\VerificationMethod;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Attendance>
 */
class AttendanceFactory extends Factory
{
    protected $model = Attendance::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'attendance_session_id' => AttendanceSession::factory(),
            'student_id' => Student::factory(),
            'status' => AttendanceStatus::Present,
            'verification_method' => VerificationMethod::Manual,
            'latitude' => null,
            'longitude' => null,
            'gps_accuracy_meters' => null,
            'distance_meters' => null,
            'checked_in_at' => now(),
            'marked_by' => null,
            'remarks' => null,
        ];
    }

    public function absent(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => AttendanceStatus::Absent,
            'verification_method' => VerificationMethod::System,
            'checked_in_at' => null,
        ]);
    }
}
