<?php

namespace App\Console\Commands;

use App\Enums\AttendanceSessionStatus;
use App\Enums\ClassSectionStatus;
use App\Enums\ClassScheduleStatus;
use App\Enums\ClassroomStatus;
use App\Models\AttendanceSession;
use App\Models\ClassSchedule;
use App\Models\TeacherAssignment;
use App\Models\TimetableSetting;
use App\Modules\Attendance\Services\AttendanceSessionServices;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SyncScheduledAttendanceSessions extends Command
{
    protected $signature = 'attendance:sync-scheduled-sessions';

    protected $description = 'Create and activate attendance sessions from today’s assigned class timetable.';

    public function handle(AttendanceSessionServices $sessions): int
    {
        $settings = TimetableSetting::query()->find(1);
        $timezone = $settings?->timezone ?: 'Asia/Phnom_Penh';
        $now = Carbon::now($timezone);

        if ($settings?->automatic_attendance_enabled) {
            $this->prepareToday($now, $timezone, $settings);
        }

        AttendanceSession::query()
            ->where('status', AttendanceSessionStatus::Open->value)
            ->whereNotNull('session_ends_at')
            ->where('session_ends_at', '<=', $now)
            ->with('teacher')
            ->orderBy('id')
            ->get()
            ->each(function (AttendanceSession $session) use ($sessions): void {
                if ($session->teacher) {
                    $sessions->close($session, $session->teacher);
                }
            });

        return self::SUCCESS;
    }

    private function prepareToday(Carbon $now, string $timezone, TimetableSetting $settings): void
    {
        $today = $now->toDateString();
        $schedules = ClassSchedule::query()
            ->where('status', ClassScheduleStatus::Active->value)
            ->where('day_of_week', $now->isoWeekday())
            ->where(fn ($range) => $range->whereNull('effective_from')->orWhereDate('effective_from', '<=', $today))
            ->where(fn ($range) => $range->whereNull('effective_until')->orWhereDate('effective_until', '>=', $today))
            ->whereHas('classroom', fn ($classroom) => $classroom->where('status', ClassroomStatus::Active->value))
            ->whereHas('classSection', fn ($section) => $section
                ->where('status', ClassSectionStatus::Active->value)
                ->whereHas('semester', fn ($semester) => $semester
                    ->whereDate('start_date', '<=', $today)
                    ->whereDate('end_date', '>=', $today)))
            ->with(['classroom', 'classSection.teacherAssignments'])
            ->orderBy('id')
            ->get();

        foreach ($schedules as $schedule) {
            if ($settings->geofencing_enabled && ($schedule->classroom?->latitude === null || $schedule->classroom?->longitude === null)) {
                $this->warn("Skipped schedule {$schedule->id}: classroom geofence coordinates are missing.");
                continue;
            }
            $teacherIds = TeacherAssignment::query()
                ->where('class_section_id', $schedule->class_section_id)
                ->whereHas('teacher.user', fn ($user) => $user->where('status', 'active'))
                ->orderBy('id')
                ->pluck('teacher_id');
            if ($teacherIds->count() !== 1) {
                $this->warn("Skipped schedule {$schedule->id}: automatic attendance requires exactly one active teacher assignment.");
                continue;
            }
            $teacherId = (int) $teacherIds->first();

            $startsAt = Carbon::parse($today.' '.$schedule->start_time, $timezone);
            $endsAt = Carbon::parse($today.' '.$schedule->end_time, $timezone);
            if ($now->gte($endsAt)) continue;

            $checkInClosesAt = $startsAt->copy()->addMinutes($settings->check_in_window_minutes);
            if ($checkInClosesAt->gt($endsAt)) $checkInClosesAt = $endsAt->copy();
            $lateAfter = $startsAt->copy()->addMinutes($settings->late_after_minutes);
            if ($lateAfter->gt($checkInClosesAt)) $lateAfter = $checkInClosesAt->copy();

            DB::transaction(function () use ($schedule, $today, $startsAt, $lateAfter, $checkInClosesAt, $endsAt, $teacherId, $now): void {
                ClassSchedule::query()->whereKey($schedule->id)->lockForUpdate()->firstOrFail();
                $session = AttendanceSession::query()
                    ->where('class_schedule_id', $schedule->id)
                    ->whereDate('session_date', $today)
                    ->first();

                if (! $session) {
                    $session = AttendanceSession::create([
                        'class_section_id' => $schedule->class_section_id,
                        'class_schedule_id' => $schedule->id,
                        'teacher_id' => $teacherId,
                        'classroom_id' => $schedule->classroom_id,
                        'session_date' => $today,
                        'starts_at' => $startsAt,
                        'late_after' => $lateAfter,
                        'closes_at' => $checkInClosesAt,
                        'session_ends_at' => $endsAt,
                        'closed_at' => null,
                        'status' => AttendanceSessionStatus::Scheduled,
                        'allowed_latitude' => $schedule->classroom?->latitude ?? 0,
                        'allowed_longitude' => $schedule->classroom?->longitude ?? 0,
                        'allowed_radius_meters' => $schedule->classroom?->allowed_radius_meters ?? 0,
                    ]);
                }

                if ($session->status === AttendanceSessionStatus::Scheduled && $now->gte($session->starts_at)) {
                    $session->update(['status' => AttendanceSessionStatus::Open]);
                }
            }, 3);
        }
    }
}
