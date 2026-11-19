<?php

namespace Database\Seeders;

use App\Enums\AttendanceSessionStatus;
use App\Enums\AttendanceStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\VerificationMethod;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\ClassSection;
use App\Models\Enrollment;
use App\Models\Teacher;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AttendanceTrackingDemoSeeder extends Seeder
{
    /** Seed one ready-to-test teacher attendance session for CS-101 Section A. */
    public function run(): void
    {
        $teacher = Teacher::query()->whereHas('user', fn ($query) => $query->where('email', 'teacher@example.com'))->first();
        $section = ClassSection::query()
            ->where('section_code', 'A')
            ->whereHas('course', fn ($query) => $query->where('course_code', 'CS-101'))
            ->first();

        if (! $teacher || ! $section) {
            $this->command?->error('Run the standard database seeders first. CS-101 and teacher@example.com are required.');
            return;
        }

        $schedule = $section->classSchedules()->with('classroom')->whereNotNull('classroom_id')->first();
        $students = Enrollment::query()
            ->where('class_section_id', $section->id)
            ->where('status', EnrollmentStatus::Enrolled->value)
            ->orderBy('student_id')
            ->limit(10)
            ->get();

        if (! $schedule || ! $schedule->classroom || $students->isEmpty()) {
            $this->command?->error('CS-101 needs an active classroom schedule and enrolled students before attendance can be seeded.');
            return;
        }

        $now = Carbon::now('Asia/Phnom_Penh');
        $session = AttendanceSession::query()
            ->where('teacher_id', $teacher->id)
            ->where('class_section_id', $section->id)
            ->whereDate('session_date', $now->toDateString())
            ->where('status', AttendanceSessionStatus::Open->value)
            ->first();

        if (! $session) {
            $session = AttendanceSession::create([
                'class_section_id' => $section->id,
                'class_schedule_id' => $schedule->id,
                'teacher_id' => $teacher->id,
                'classroom_id' => $schedule->classroom_id,
                'session_date' => $now->toDateString(),
                'starts_at' => $now->copy()->subMinutes(30),
                'late_after' => $now->copy()->subMinutes(10),
                'closes_at' => $now->copy()->addHours(2),
                'session_ends_at' => $now->copy()->addHours(2),
                'status' => AttendanceSessionStatus::Open,
                'allowed_latitude' => $schedule->classroom->latitude,
                'allowed_longitude' => $schedule->classroom->longitude,
                'allowed_radius_meters' => $schedule->classroom->allowed_radius_meters,
            ]);
        }

        $statuses = [
            AttendanceStatus::Present,
            AttendanceStatus::Late,
            AttendanceStatus::Absent,
            AttendanceStatus::Excused,
        ];

        foreach ($students->values() as $index => $enrollment) {
            if ($index >= count($statuses)) {
                break;
            }

            $status = $statuses[$index];
            Attendance::updateOrCreate(
                [
                    'attendance_session_id' => $session->id,
                    'student_id' => $enrollment->student_id,
                ],
                [
                    'status' => $status,
                    'verification_method' => VerificationMethod::Manual,
                    'checked_in_at' => in_array($status, [AttendanceStatus::Present, AttendanceStatus::Late], true)
                        ? $now
                        : null,
                    'marked_by' => $teacher->user_id,
                    'remarks' => $status === AttendanceStatus::Excused ? 'Demo permission record' : null,
                ],
            );
        }

        $this->command?->info("Ready attendance demo: {$section->course->course_code} Section {$section->section_code}, session #{$session->id}, teacher@example.com / password");
        $this->command?->info('Demo status: 1 present, 1 late, 1 absent, 1 permission, remaining students pending.');
    }
}
