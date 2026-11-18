<?php

namespace App\Modules\ClassSchedules\Services;

use App\Enums\ClassScheduleStatus;
use App\Enums\ClassSectionStatus;
use App\Models\ClassSchedule;
use App\Models\ClassSection;
use App\Models\ScheduleTimeSlot;
use App\Models\Teacher;
use App\Models\TimetableSetting;
use Illuminate\Validation\ValidationException;

class TeacherWorkloadService
{
    /** @return array<string, mixed> */
    public function report(Teacher $teacher, int $semesterId): array
    {
        $semesterRecord = \App\Models\Semester::query()->findOrFail($semesterId);
        $sectionIds = ClassSection::query()
            ->whereHas('teacherAssignments', fn ($query) => $query->where('teacher_id', $teacher->id))
            ->where('semester_id', $semesterId)
            ->where('status', ClassSectionStatus::Active->value)
            ->pluck('id')->unique()->values();
        $schedules = ClassSchedule::query()
            ->with(['classSection.course', 'classSection.semester', 'classroom', 'timeSlot.studyPeriod'])
            ->whereIn('class_section_id', $sectionIds)
            ->where('status', ClassScheduleStatus::Active->value)
            ->whereHas('classSection', fn ($section) => $section->where('semester_id', $semesterId))
            ->where(fn ($range) => $range->whereNull('effective_from')->orWhereDate('effective_from', '<=', $semesterRecord->end_date->toDateString()))
            ->where(fn ($range) => $range->whereNull('effective_until')->orWhereDate('effective_until', '>=', $semesterRecord->start_date->toDateString()))
            ->orderBy('day_of_week')->orderBy('start_time')->get();

        $hours = $schedules->sum(function (ClassSchedule $schedule): float {
            [$startHour, $startMinute] = array_map('intval', explode(':', substr((string) $schedule->start_time, 0, 5)));
            [$endHour, $endMinute] = array_map('intval', explode(':', substr((string) $schedule->end_time, 0, 5)));
            return (($endHour * 60 + $endMinute) - ($startHour * 60 + $startMinute)) / 60;
        });
        $setting = TimetableSetting::query()->find(1);
        $sectionLimit = $setting?->max_assigned_sections;

        $slots = ScheduleTimeSlot::query()->with('studyPeriod')->where('is_active', true)->where('is_break', false)
            ->whereHas('studyPeriod', fn ($period) => $period->where('is_active', true))
            ->orderBy('study_period_id')->orderBy('position')->get();
        $available = [];
        foreach ([1, 2, 3, 4, 5] as $day) {
            foreach ($slots as $slot) {
                $hasConflict = $schedules->contains(fn (ClassSchedule $schedule): bool => $schedule->day_of_week === $day
                    && $schedule->start_time < $slot->ends_at
                    && $schedule->end_time > $slot->starts_at);
                if (! $hasConflict) {
                    $available[] = [
                        'day_of_week' => $day,
                        'time_slot_id' => $slot->id,
                        'period' => $slot->studyPeriod?->name,
                        'slot' => $slot->name,
                        'starts_at' => substr((string) $slot->starts_at, 0, 5),
                        'ends_at' => substr((string) $slot->ends_at, 0, 5),
                    ];
                }
            }
        }

        return [
            'teacher' => ['id' => $teacher->id, 'name' => $teacher->user?->name, 'teacher_code' => $teacher->teacher_code],
            'semester' => ['id' => $semesterRecord->id, 'name' => $semesterRecord->name],
            'unique_assigned_sections' => $sectionIds->count(),
            'sessions_per_week' => $schedules->count(),
            'teaching_hours_per_week' => round($hours, 2),
            'assigned_periods' => $schedules->map(fn (ClassSchedule $schedule) => $schedule->timeSlot?->studyPeriod?->name ?? 'Custom')->unique()->values(),
            'daily_schedule' => $schedules->groupBy('day_of_week')->map(fn ($rows, $day) => [
                'day_of_week' => (int) $day,
                'sessions' => $rows->map(fn (ClassSchedule $schedule) => [
                    'id' => $schedule->id,
                    'class_section_id' => $schedule->class_section_id,
                    'course' => $schedule->classSection?->course?->name,
                    'section_code' => $schedule->classSection?->section_code,
                    'period' => $schedule->timeSlot?->studyPeriod?->name ?? 'Custom',
                    'starts_at' => substr((string) $schedule->start_time, 0, 5),
                    'ends_at' => substr((string) $schedule->end_time, 0, 5),
                    'classroom' => $schedule->classroom?->room_code,
                ])->values(),
            ])->values(),
            'available_time_slots' => $available,
            'limits' => [
                'max_weekly_teaching_hours' => (float) ($setting?->max_weekly_teaching_hours ?? 30),
                'max_assigned_sections' => $sectionLimit,
                'over_weekly_hours_limit' => $hours > (float) ($setting?->max_weekly_teaching_hours ?? 30),
                'over_section_limit' => $sectionLimit !== null && $sectionIds->count() > $sectionLimit,
            ],
        ];
    }
}
