<?php

namespace App\Modules\Teachers\Services;

use App\Enums\AttendanceSessionStatus;
use App\Enums\AttendanceStatus;
use App\Enums\ClassSectionStatus;
use App\Enums\EnrollmentStatus;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\ClassSchedule;
use App\Models\Teacher;
use Illuminate\Support\Carbon;

class TeacherDashboardServices
{
    /** @return array<string, mixed> */
    public function summary(Teacher $teacher): array
    {
        $now = Carbon::now('Asia/Phnom_Penh');
        $today = $now->toDateString();

        $todaySchedules = ClassSchedule::query()
            ->with(['classroom', 'classSection.course.department', 'classSection.semester.academicYear'])
            ->where('day_of_week', $now->isoWeekday())
            ->where(fn ($query) => $query->whereNull('effective_from')->orWhereDate('effective_from', '<=', $today))
            ->where(fn ($query) => $query->whereNull('effective_until')->orWhereDate('effective_until', '>=', $today))
            ->whereHas('classSection', fn ($section) => $section
                ->where('status', ClassSectionStatus::Active->value)
                ->whereHas('teacherAssignments', fn ($assignment) => $assignment->where('teacher_id', $teacher->id)))
            ->orderBy('start_time')
            ->get();

        $openSessions = AttendanceSession::query()
            ->with(['classSection.course', 'classroom'])
            ->withCount([
                'attendances as present_count' => fn ($query) => $query->where('status', AttendanceStatus::Present->value),
                'attendances as late_count' => fn ($query) => $query->where('status', AttendanceStatus::Late->value),
                'attendances as absent_count' => fn ($query) => $query->where('status', AttendanceStatus::Absent->value),
                'attendances as excused_count' => fn ($query) => $query->where('status', AttendanceStatus::Excused->value),
            ])
            ->where('teacher_id', $teacher->id)
            ->where('status', AttendanceSessionStatus::Open->value)
            ->orderBy('closes_at')
            ->get();

        $attendanceTotals = Attendance::query()
            ->join('attendance_sessions', 'attendance_sessions.id', '=', 'attendances.attendance_session_id')
            ->where('attendance_sessions.teacher_id', $teacher->id)
            ->whereDate('attendance_sessions.session_date', '>=', $now->copy()->subDays(6)->toDateString())
            ->whereDate('attendance_sessions.session_date', '<=', $today)
            ->selectRaw('attendances.status, COUNT(*) as total')
            ->groupBy('attendances.status')
            ->pluck('total', 'status');

        $openSessionPayload = $openSessions->map(function (AttendanceSession $session) use ($now): array {
            return [
                'id' => $session->id,
                'class_section_id' => $session->class_section_id,
                'class_name' => $session->classSection->course->name,
                'course_code' => $session->classSection->course->course_code,
                'section_code' => $session->classSection->section_code,
                'session_date' => $session->session_date->toDateString(),
                'starts_at' => $session->starts_at->toIso8601String(),
                'closes_at' => $session->closes_at->toIso8601String(),
                'classroom' => $session->classroom->room_code,
                'awaiting_closure' => $session->closes_at->lte($now),
                'attendance' => [
                    'present' => (int) $session->present_count,
                    'late' => (int) $session->late_count,
                    'absent' => (int) $session->absent_count,
                    'excused' => (int) $session->excused_count,
                ],
            ];
        });

        return [
            'date' => $today,
            'timezone' => 'Asia/Phnom_Penh',
            'summary' => [
                'classes_today' => $todaySchedules->count(),
                'open_sessions' => $openSessions->count(),
                'awaiting_closure' => $openSessionPayload->where('awaiting_closure', true)->count(),
                'attendance_last_7_days' => [
                    'present' => (int) ($attendanceTotals[AttendanceStatus::Present->value] ?? 0),
                    'late' => (int) ($attendanceTotals[AttendanceStatus::Late->value] ?? 0),
                    'absent' => (int) ($attendanceTotals[AttendanceStatus::Absent->value] ?? 0),
                    'excused' => (int) ($attendanceTotals[AttendanceStatus::Excused->value] ?? 0),
                ],
            ],
            'today_schedule' => $todaySchedules->map(fn (ClassSchedule $schedule): array => [
                'id' => $schedule->id,
                'class_section_id' => $schedule->class_section_id,
                'course_code' => $schedule->classSection->course->course_code,
                'class_name' => $schedule->classSection->course->name,
                'section_code' => $schedule->classSection->section_code,
                'semester' => $schedule->classSection->semester->name,
                'start_time' => $schedule->start_time,
                'end_time' => $schedule->end_time,
                'classroom' => $schedule->classroom->room_code,
                'building' => $schedule->classroom->building,
            ])->values(),
            'open_sessions' => $openSessionPayload->values(),
        ];
    }
}
