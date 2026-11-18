<?php

namespace App\Modules\ClassSchedules\Services;

use App\Enums\ClassScheduleStatus;
use App\Enums\ClassSectionStatus;
use App\Models\ClassSchedule;
use App\Models\Semester;
use Carbon\CarbonImmutable;

class TimetableOverviewService
{
    /** @param array{semester_id?: int|string|null, week_start?: string|null} $filters
     *  @return array{week_start: string, week_end: string, weekly_sessions: int, active_class_sections: int, assigned_teachers: int, scheduling_conflicts: int}
     */
    public function summary(array $filters = []): array
    {
        $timezone = 'Asia/Phnom_Penh';
        $weekStart = isset($filters['week_start'])
            ? CarbonImmutable::parse($filters['week_start'], $timezone)->startOfWeek(CarbonImmutable::MONDAY)
            : CarbonImmutable::now($timezone)->startOfWeek(CarbonImmutable::MONDAY);
        $weekEnd = $weekStart->addDays(6);
        $semester = ! empty($filters['semester_id']) ? Semester::query()->findOrFail($filters['semester_id']) : null;

        if ($semester && ($semester->start_date->gt($weekEnd) || $semester->end_date->lt($weekStart))) {
            return [
                'week_start' => $weekStart->toDateString(),
                'week_end' => $weekEnd->toDateString(),
                'weekly_sessions' => 0,
                'active_class_sections' => 0,
                'assigned_teachers' => 0,
                'scheduling_conflicts' => 0,
            ];
        }

        $query = ClassSchedule::query()
            ->with(['classSection.teacherAssignments', 'classSection.semester'])
            ->where('status', ClassScheduleStatus::Active->value)
            ->whereBetween('day_of_week', [1, 5])
            ->where(fn ($range) => $range->whereNull('effective_from')->orWhereDate('effective_from', '<=', $weekEnd->toDateString()))
            ->where(fn ($range) => $range->whereNull('effective_until')->orWhereDate('effective_until', '>=', $weekStart->toDateString()));

        if (! empty($filters['department_id'])) {
            $query->whereHas('classSection.course', fn ($course) => $course->where('department_id', $filters['department_id']));
        }
        if (! empty($filters['classroom_id'])) $query->where('classroom_id', $filters['classroom_id']);
        if (! empty($filters['day_of_week'])) $query->where('day_of_week', $filters['day_of_week']);
        if (! empty($filters['study_period_id'])) $query->whereHas('timeSlot', fn ($slot) => $slot->where('study_period_id', $filters['study_period_id']));
        if (! empty($filters['teacher_id'])) {
            $query->whereHas('classSection.teacherAssignments', fn ($assignment) => $assignment->where('teacher_id', $filters['teacher_id']));
        }

        if (! empty($filters['semester_id'])) {
            $query->whereHas('classSection', fn ($section) => $section
                ->where('semester_id', $filters['semester_id'])
                ->where('status', ClassSectionStatus::Active->value));
        }

        $schedules = $query->orderBy('day_of_week')->orderBy('start_time')->get()
            ->filter(function (ClassSchedule $schedule) use ($weekStart): bool {
                $day = (int) $schedule->day_of_week;
                if ($day < 1 || $day > 5) return false;
                $occurrenceDate = $weekStart->addDays($day - 1)->toDateString();
                $semester = $schedule->classSection?->semester;
                return $semester !== null
                    && $semester->start_date->toDateString() <= $occurrenceDate
                    && $semester->end_date->toDateString() >= $occurrenceDate
                    && ($schedule->effective_from === null || $schedule->effective_from->toDateString() <= $occurrenceDate)
                    && ($schedule->effective_until === null || $schedule->effective_until->toDateString() >= $occurrenceDate);
            })->values();
        $sections = $schedules
            ->filter(fn (ClassSchedule $schedule): bool => $schedule->classSection?->status === ClassSectionStatus::Active)
            ->pluck('class_section_id')->unique();
        $teachers = $schedules->flatMap(fn (ClassSchedule $schedule) => $schedule->classSection?->teacherAssignments->pluck('teacher_id') ?? collect())->unique();

        $breaks = \App\Models\ScheduleTimeSlot::query()->where('is_break', true)->where('is_active', true)->get(['starts_at', 'ends_at']);
        $conflicts = $schedules->filter(fn (ClassSchedule $schedule): bool => $breaks->contains(fn ($break): bool => $schedule->start_time < $break->ends_at && $schedule->end_time > $break->starts_at))->count();
        $rows = $schedules->values();
        for ($i = 0; $i < $rows->count(); $i++) {
            for ($j = $i + 1; $j < $rows->count(); $j++) {
                $left = $rows[$i];
                $right = $rows[$j];
                if ($left->day_of_week !== $right->day_of_week
                    || $left->start_time >= $right->end_time
                    || $left->end_time <= $right->start_time
                    || ! $this->dateRangesOverlapInWeek($left, $right, $weekStart, $weekEnd)) {
                    continue;
                }

                $sameSection = $left->class_section_id === $right->class_section_id;
                $sameRoom = $left->classroom_id === $right->classroom_id;
                $leftTeacherIds = $left->classSection?->teacherAssignments->pluck('teacher_id')->all() ?? [];
                $rightTeacherIds = $right->classSection?->teacherAssignments->pluck('teacher_id')->all() ?? [];
                if ($sameSection || $sameRoom || array_intersect($leftTeacherIds, $rightTeacherIds) !== []) $conflicts++;
            }
        }

        return [
            'week_start' => $weekStart->toDateString(),
            'week_end' => $weekEnd->toDateString(),
            'weekly_sessions' => $schedules->count(),
            'active_class_sections' => $sections->count(),
            'assigned_teachers' => $teachers->count(),
            'scheduling_conflicts' => $conflicts,
        ];
    }

    private function dateRangesOverlapInWeek(ClassSchedule $left, ClassSchedule $right, CarbonImmutable $weekStart, CarbonImmutable $weekEnd): bool
    {
        $leftFrom = $left->effective_from?->toDateString() ?? $weekStart->toDateString();
        $leftUntil = $left->effective_until?->toDateString() ?? $weekEnd->toDateString();
        $rightFrom = $right->effective_from?->toDateString() ?? $weekStart->toDateString();
        $rightUntil = $right->effective_until?->toDateString() ?? $weekEnd->toDateString();

        return max($leftFrom, $rightFrom, $weekStart->toDateString()) <= min($leftUntil, $rightUntil, $weekEnd->toDateString());
    }
}
