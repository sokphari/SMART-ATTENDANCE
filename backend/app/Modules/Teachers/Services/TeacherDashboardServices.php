<?php

namespace App\Modules\Teachers\Services;

use App\Enums\AttendanceSessionStatus;
use App\Enums\AttendanceStatus;
use App\Enums\ClassSectionStatus;
use App\Enums\EnrollmentStatus;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\ClassSchedule;
use App\Models\ClassSection;
use App\Models\Enrollment;
use App\Models\RoleModulePermission;
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
            ->where('status', 'active')
            ->where(fn ($query) => $query->whereNull('effective_from')->orWhereDate('effective_from', '<=', $today))
            ->where(fn ($query) => $query->whereNull('effective_until')->orWhereDate('effective_until', '>=', $today))
            ->whereHas('classSection', fn ($section) => $section
                ->where('status', ClassSectionStatus::Active->value)
                ->whereHas('semester', fn ($semester) => $semester->whereDate('start_date', '<=', $today)->whereDate('end_date', '>=', $today))
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

        $assignedClassCount = ClassSection::query()
            ->where('status', ClassSectionStatus::Active->value)
            ->whereHas('semester', fn ($semester) => $semester->whereDate('start_date', '<=', $today)->whereDate('end_date', '>=', $today))
            ->whereHas('teacherAssignments', fn ($assignment) => $assignment->where('teacher_id', $teacher->id))
            ->count();

        $checkedInToday = Attendance::query()
            ->whereHas('attendanceSession', fn ($session) => $session->where('teacher_id', $teacher->id)->whereDate('session_date', $today))
            ->whereIn('status', [AttendanceStatus::Present->value, AttendanceStatus::Late->value])
            ->count();

        $enrolledCounts = Enrollment::query()
            ->whereIn('class_section_id', $openSessions->pluck('class_section_id')->unique())
            ->where('status', EnrollmentStatus::Enrolled->value)
            ->selectRaw('class_section_id, COUNT(*) as total')
            ->groupBy('class_section_id')
            ->pluck('total', 'class_section_id');

        $attendanceModuleEnabled = RoleModulePermission::query()
            ->where('role', 'teacher')
            ->where('module', 'attendance_sessions')
            ->value('enabled');
        $openSessionIds = $attendanceModuleEnabled === false || $attendanceModuleEnabled === 0 || $attendanceModuleEnabled === '0'
            ? collect()
            : AttendanceSession::query()
            ->where('teacher_id', $teacher->id)
            ->whereDate('session_date', $today)
            ->whereIn('class_schedule_id', $todaySchedules->pluck('id'))
            ->where('status', AttendanceSessionStatus::Open->value)
            ->pluck('id', 'class_schedule_id');

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
        $pendingReviews = $openSessions->sum(function (AttendanceSession $session) use ($enrolledCounts): int {
            $marked = (int) $session->present_count + (int) $session->late_count + (int) $session->absent_count + (int) $session->excused_count;
            return max(0, (int) ($enrolledCounts[$session->class_section_id] ?? 0) - $marked);
        });

        return [
            'date' => $today,
            'timezone' => 'Asia/Phnom_Penh',
            'summary' => [
                'assigned_classes' => $assignedClassCount,
                'today_sessions' => $todaySchedules->count(),
                'checked_in_today' => $checkedInToday,
                'pending_attendance_reviews' => $pendingReviews,
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
            'today_schedule' => $todaySchedules->map(function (ClassSchedule $schedule) use ($now, $today, $openSessionIds): array {
                $startsAt = Carbon::parse($today.' '.$schedule->start_time, 'Asia/Phnom_Penh');
                $endsAt = Carbon::parse($today.' '.$schedule->end_time, 'Asia/Phnom_Penh');

                return [
                'id' => $schedule->id,
                'class_section_id' => $schedule->class_section_id,
                'attendance_session_id' => $openSessionIds[$schedule->id] ?? null,
                'course_code' => $schedule->classSection->course->course_code,
                'class_name' => $schedule->classSection->course->name,
                'section_code' => $schedule->classSection->section_code,
                'semester' => $schedule->classSection->semester->name,
                'start_time' => $schedule->start_time,
                'end_time' => $schedule->end_time,
                'classroom' => $schedule->classroom->room_code,
                'building' => $schedule->classroom->building,
                'status' => $now->lt($startsAt) ? 'upcoming' : ($now->lte($endsAt) ? 'in_progress' : 'completed'),
            ];
            })->values(),
            'open_sessions' => $openSessionPayload->values(),
        ];
    }
}
