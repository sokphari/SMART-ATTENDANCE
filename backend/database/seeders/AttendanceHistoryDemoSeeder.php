<?php

namespace Database\Seeders;

use App\Enums\AttendanceCorrectionStatus;
use App\Enums\AttendanceSessionStatus;
use App\Enums\AttendanceStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\VerificationMethod;
use App\Models\Attendance;
use App\Models\AttendanceCorrection;
use App\Models\AttendanceSession;
use App\Models\ClassSection;
use App\Models\Enrollment;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AttendanceHistoryDemoSeeder extends Seeder
{
    /** Seed five closed, linked attendance sessions and sample correction requests. */
    public function run(): void
    {
        $teacher = Teacher::query()->whereHas('user', fn ($query) => $query->where('email', 'teacher@example.com'))->first();
        $section = ClassSection::query()
            ->where('section_code', 'A')
            ->whereHas('course', fn ($query) => $query->where('course_code', 'CS-101'))
            ->first();

        if (! $teacher || ! $section) {
            $this->command?->warn('Skipped attendance history demo: standard teacher and CS-101 section are required.');
            return;
        }

        $schedule = $section->classSchedules()->with('classroom')->whereNotNull('classroom_id')->first();
        $enrollments = Enrollment::query()
            ->with('student.user')
            ->where('class_section_id', $section->id)
            ->where('status', EnrollmentStatus::Enrolled->value)
            ->orderBy('student_id')
            ->limit(5)
            ->get();

        if (! $schedule?->classroom || $enrollments->count() < 5) {
            $this->command?->warn('Skipped attendance history demo: CS-101 needs a scheduled room and five enrolled students.');
            return;
        }

        $timezone = 'Asia/Phnom_Penh';
        $weekStart = Carbon::now($timezone)->startOfWeek(Carbon::MONDAY);
        $statuses = [
            AttendanceStatus::Present,
            AttendanceStatus::Late,
            AttendanceStatus::Absent,
            AttendanceStatus::Excused,
            AttendanceStatus::Present,
        ];
        $sessions = [];

        // Use previous Monday dates so every row matches the seeded weekly timetable.
        for ($weekOffset = 1; $weekOffset <= 5; $weekOffset++) {
            $date = $weekStart->copy()->subWeeks($weekOffset);
            $startsAt = Carbon::parse($date->toDateString().' '.$schedule->start_time, $timezone);
            $endsAt = Carbon::parse($date->toDateString().' '.$schedule->end_time, $timezone);
            $session = AttendanceSession::firstOrCreate(
                ['class_section_id' => $section->id, 'session_date' => $date->toDateString()],
                [
                    'class_schedule_id' => $schedule->id,
                    'teacher_id' => $teacher->id,
                    'classroom_id' => $schedule->classroom_id,
                    'starts_at' => $startsAt,
                    'late_after' => $startsAt->copy()->addMinutes(15),
                    'closes_at' => $endsAt,
                    'session_ends_at' => $endsAt,
                    'closed_at' => $endsAt,
                    'status' => AttendanceSessionStatus::Closed,
                    'allowed_latitude' => $schedule->classroom->latitude,
                    'allowed_longitude' => $schedule->classroom->longitude,
                    'allowed_radius_meters' => $schedule->classroom->allowed_radius_meters,
                ],
            );
            $sessions[] = $session;

            foreach ($enrollments->values() as $index => $enrollment) {
                $status = $statuses[$index];
                $attendance = Attendance::updateOrCreate(
                    ['attendance_session_id' => $session->id, 'student_id' => $enrollment->student_id],
                    [
                        'status' => $status,
                        'verification_method' => VerificationMethod::Manual,
                        'checked_in_at' => in_array($status, [AttendanceStatus::Present, AttendanceStatus::Late], true)
                            ? $startsAt->copy()->addMinutes($status === AttendanceStatus::Late ? 20 : 3)
                            : null,
                        'marked_by' => $teacher->user_id,
                        'remarks' => $status === AttendanceStatus::Excused ? 'Approved student permission' : null,
                    ],
                );

                if ($weekOffset === 1) {
                    $this->ensureCorrectionRequest($attendance, $enrollment->student->user, $status);
                }
            }
        }

        $this->command?->info('Ensured five linked historical attendance sessions with five student records each and sample correction requests.');
    }

    private function ensureCorrectionRequest(Attendance $attendance, User $student, AttendanceStatus $currentStatus): void
    {
        if (AttendanceCorrection::query()->where('attendance_id', $attendance->id)->where('status', AttendanceCorrectionStatus::Pending->value)->exists()) {
            return;
        }

        $requestedStatus = $currentStatus === AttendanceStatus::Present
            ? AttendanceStatus::Absent
            : AttendanceStatus::Present;

        AttendanceCorrection::firstOrCreate(
            [
                'attendance_id' => $attendance->id,
                'requested_by' => $student->id,
                'reason' => 'Please review my attendance record for this class.',
            ],
            [
                'reviewed_by' => null,
                'requested_status' => $requestedStatus,
                'status' => AttendanceCorrectionStatus::Pending,
                'review_note' => null,
                'reviewed_at' => null,
            ],
        );
    }
}
