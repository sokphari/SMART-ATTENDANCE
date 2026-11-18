<?php

namespace App\Modules\ClassSchedules\Services;

use App\Enums\ClassScheduleStatus;
use App\Enums\ClassroomStatus;
use App\Enums\ClassSectionStatus;
use App\Models\Classroom;
use App\Models\ClassSchedule;
use App\Models\ClassSection;
use App\Models\ScheduleTimeSlot;
use App\Models\Semester;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use Illuminate\Validation\ValidationException;

class ScheduleConflictService
{
    /** @param array<string, mixed> $data */
    public function lockResources(array $data): array
    {
        $section = ClassSection::query()->whereKey($data['class_section_id'])->lockForUpdate()->firstOrFail();
        $classroom = Classroom::query()->whereKey($data['classroom_id'])->lockForUpdate()->firstOrFail();
        $teacherIds = TeacherAssignment::query()->where('class_section_id', $section->id)->orderBy('teacher_id')->pluck('teacher_id');
        Teacher::query()->whereIn('id', $teacherIds)->orderBy('id')->lockForUpdate()->get(['id']);

        return [$section, $classroom, $teacherIds->all()];
    }

    /** @param array<string, mixed> $data */
    public function assertValid(array $data, ?int $ignoreId = null): void
    {
        $start = substr((string) $data['start_time'], 0, 8);
        $end = substr((string) $data['end_time'], 0, 8);
        if ($end <= $start) {
            $this->fail('end_time', 'End time must be later than start time.');
        }

        $day = (int) $data['day_of_week'];
        $from = $data['effective_from'] ?? null;
        $until = $data['effective_until'] ?? null;

        [$section, $classroom, $teacherIds] = $this->lockResources($data);
        $status = $data['status'] ?? ClassScheduleStatus::Active->value;
        if ($status instanceof ClassScheduleStatus) $status = $status->value;
        $isActive = $status === ClassScheduleStatus::Active->value;
        if (! $isActive) {
            return;
        }
        if ($from !== null && $until !== null && $from > $until) {
            $this->fail('effective_until', 'End date must be on or after the start date.');
        }

        if ($section->status !== ClassSectionStatus::Active) {
            $this->fail('class_section_id', 'Select an active class section.');
        }
        if ($classroom->status !== ClassroomStatus::Active) {
            $this->fail('classroom_id', 'Select an active classroom.');
        }

        $semester = Semester::query()->whereKey($section->semester_id)->lockForUpdate()->firstOrFail();
        $semesterStart = $semester->start_date->toDateString();
        $semesterEnd = $semester->end_date->toDateString();
        if (($from !== null && $from < $semesterStart)
            || ($until !== null && $until > $semesterEnd)) {
            $this->fail('effective_from', "Schedule dates must stay within {$semester->name} ({$semesterStart} to {$semesterEnd}).");
        }
        // An empty date range means the schedule recurs for the full section semester.
        $from ??= $semesterStart;
        $until ??= $semesterEnd;

        if (! empty($data['time_slot_id'])) {
            $slot = ScheduleTimeSlot::query()->with('studyPeriod')->whereKey($data['time_slot_id'])->lockForUpdate()->firstOrFail();
            if (! $slot->is_active || $slot->is_break || ! $slot->studyPeriod?->is_active) {
                $this->fail('time_slot_id', 'Select an active teaching session, not a break.');
            }
            if (substr($slot->starts_at, 0, 8) !== $start || substr($slot->ends_at, 0, 8) !== $end) {
                $this->fail('time_slot_id', 'The selected time slot does not match the submitted session time.');
            }
        } else {
            $breakOverlap = ScheduleTimeSlot::query()
                ->where('is_break', true)
                ->where('is_active', true)
                ->where('starts_at', '<', $end)
                ->where('ends_at', '>', $start)
                ->exists();
            if ($breakOverlap) {
                $this->fail('start_time', 'This schedule overlaps a configured break.');
            }
        }

        $sectionConflict = ClassSchedule::query()
            ->where('status', ClassScheduleStatus::Active->value)
            ->where('class_section_id', $section->id)
            ->whereHas('classSection.semester', fn ($term) => $term->whereDate('start_date', '<=', $until)->whereDate('end_date', '>=', $from))
            ->where('day_of_week', $day)
            ->where('start_time', '<', $end)
            ->where('end_time', '>', $start);
        $this->overlappingDates($sectionConflict, $from, $until);
        $this->ignore($sectionConflict, $ignoreId);
        if ($sectionConflict->exists()) {
            $this->fail('class_section_id', "Section {$section->section_code} already has an active class during this weekday and time.");
        }

        $roomConflict = ClassSchedule::query()
            ->where('status', ClassScheduleStatus::Active->value)
            ->where('classroom_id', $classroom->id)
            ->whereHas('classSection.semester', fn ($term) => $term->whereDate('start_date', '<=', $until)->whereDate('end_date', '>=', $from))
            ->where('day_of_week', $day)
            ->where('start_time', '<', $end)
            ->where('end_time', '>', $start);
        $this->overlappingDates($roomConflict, $from, $until);
        $this->ignore($roomConflict, $ignoreId);
        if ($roomConflict->exists()) {
            $this->fail('classroom_id', "Classroom {$classroom->room_code} is already booked during this weekday and time.");
        }

        if ($teacherIds !== []) {
            $teacherConflict = ClassSchedule::query()
                ->where('status', ClassScheduleStatus::Active->value)
                ->whereHas('classSection.teacherAssignments', fn ($query) => $query->whereIn('teacher_id', $teacherIds))
                ->whereHas('classSection.semester', fn ($term) => $term->whereDate('start_date', '<=', $until)->whereDate('end_date', '>=', $from))
                ->where('class_section_id', '!=', $section->id)
                ->where('day_of_week', $day)
                ->where('start_time', '<', $end)
                ->where('end_time', '>', $start);
            $this->overlappingDates($teacherConflict, $from, $until);
            $this->ignore($teacherConflict, $ignoreId);
            if ($teacherConflict->exists()) {
                $conflictingSchedule = $teacherConflict->with('classSection.course')->first();
                $conflictingTeacher = TeacherAssignment::query()
                    ->whereIn('teacher_id', $teacherIds)
                    ->where('class_section_id', $conflictingSchedule?->class_section_id)
                    ->with('teacher.user')
                    ->first()?->teacher?->user?->name;
                $this->fail('class_section_id', ($conflictingTeacher ?? 'An assigned teacher')." has an overlapping class schedule in another section.");
            }
        }
    }

    private function overlappingDates($query, ?string $from, ?string $until): void
    {
        if ($until !== null) {
            $query->where(fn ($range) => $range->whereNull('effective_from')->orWhere('effective_from', '<=', $until));
        }
        if ($from !== null) {
            $query->where(fn ($range) => $range->whereNull('effective_until')->orWhere('effective_until', '>=', $from));
        }
    }

    private function ignore($query, ?int $ignoreId): void
    {
        if ($ignoreId !== null) $query->whereKeyNot($ignoreId);
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => [$message]]);
    }
}
