<?php

namespace App\Modules\ClassSchedules\Requests\Concerns;

use App\Models\Classroom;
use App\Models\ClassSchedule;
use App\Models\ClassSection;
use App\Models\TeacherAssignment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\Validator;

trait ValidatesScheduleConflicts
{
    protected function validateSchedule(Validator $validator, ?int $ignoreId = null): void
    {
        if ($validator->errors()->isNotEmpty()) {
            return;
        }

        $dayOfWeek = (int) $this->input('day_of_week');
        $startTime = (string) $this->input('start_time');
        $endTime = (string) $this->input('end_time');

        if (strtotime($endTime) <= strtotime($startTime)) {
            $validator->errors()->add('end_time', 'The end time must be after the start time.');

            return;
        }

        $effectiveFrom = $this->input('effective_from');
        $effectiveUntil = $this->input('effective_until');

        if (
            $effectiveFrom !== null
            && $effectiveUntil !== null
            && strtotime((string) $effectiveUntil) < strtotime((string) $effectiveFrom)
        ) {
            $validator->errors()->add(
                'effective_until',
                'The effective until date must be after or equal to the effective from date.'
            );

            return;
        }

        $classSectionId = (int) $this->input('class_section_id');
        $classroomId = (int) $this->input('classroom_id');

        $classSection = ClassSection::find($classSectionId);

        if ($classSection !== null && ! $classSection->isActive()) {
            $validator->errors()->add(
                'class_section_id',
                'The selected class section is not active.'
            );
        }

        $classroom = Classroom::find($classroomId);

        if ($classroom !== null && ! $classroom->isActive()) {
            $validator->errors()->add(
                'classroom_id',
                'The selected classroom is not active.'
            );
        }

        $sectionConflict = ClassSchedule::query()
            ->where('class_section_id', $classSectionId)
            ->where('day_of_week', $dayOfWeek)
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime);

        $this->applyEffectiveOverlap($sectionConflict, $effectiveFrom, $effectiveUntil);
        $this->applyIgnore($sectionConflict, $ignoreId);

        if ($sectionConflict->exists()) {
            $validator->errors()->add(
                'class_section_id',
                'The class section already has a schedule in that time range.'
            );
        }

        $classroomConflict = ClassSchedule::query()
            ->where('classroom_id', $classroomId)
            ->where('day_of_week', $dayOfWeek)
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime);

        $this->applyEffectiveOverlap($classroomConflict, $effectiveFrom, $effectiveUntil);
        $this->applyIgnore($classroomConflict, $ignoreId);

        if ($classroomConflict->exists()) {
            $validator->errors()->add(
                'classroom_id',
                'The classroom is already booked for that time range.'
            );
        }

        $teacherIds = TeacherAssignment::query()
            ->where('class_section_id', $classSectionId)
            ->pluck('teacher_id');

        if ($teacherIds->isNotEmpty()) {
            $teacherSectionIds = TeacherAssignment::query()
                ->whereIn('teacher_id', $teacherIds)
                ->where('class_section_id', '!=', $classSectionId)
                ->pluck('class_section_id');

            $teacherConflict = ClassSchedule::query()
                ->whereIn('class_section_id', $teacherSectionIds)
                ->where('day_of_week', $dayOfWeek)
                ->where('start_time', '<', $endTime)
                ->where('end_time', '>', $startTime);

            $this->applyEffectiveOverlap($teacherConflict, $effectiveFrom, $effectiveUntil);

            if ($teacherConflict->exists()) {
                $validator->errors()->add(
                    'class_section_id',
                    'An assigned teacher already has a schedule in that time range.'
                );
            }
        }
    }

    private function applyEffectiveOverlap(
        Builder $query,
        mixed $effectiveFrom,
        mixed $effectiveUntil
    ): void {
        if ($effectiveUntil !== null) {
            $query->where(function (Builder $query) use ($effectiveUntil): void {
                $query->whereNull('effective_from')
                    ->orWhere('effective_from', '<=', $effectiveUntil);
            });
        }

        if ($effectiveFrom !== null) {
            $query->where(function (Builder $query) use ($effectiveFrom): void {
                $query->whereNull('effective_until')
                    ->orWhere('effective_until', '>=', $effectiveFrom);
            });
        }
    }

    private function applyIgnore(Builder $query, ?int $ignoreId): void
    {
        if ($ignoreId !== null) {
            $query->whereKeyNot($ignoreId);
        }
    }
}
