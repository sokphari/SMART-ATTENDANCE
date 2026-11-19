<?php

namespace App\Modules\ClassSchedules\Services;

use App\Models\ClassSchedule;
use App\Models\ScheduleTimeSlot;
use App\Models\StudyPeriod;
use App\Models\TimetableSetting;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TimetableConfigurationService
{
    public function __construct(private readonly ScheduleConflictService $conflicts) {}

    /** @return array<string, mixed> */
    public function configuration(): array
    {
        $settings = TimetableSetting::query()->find(1);

        return [
            'timezone' => $settings?->timezone ?? 'Asia/Phnom_Penh',
            'weekdays' => [1, 2, 3, 4, 5],
            'max_weekly_teaching_hours' => (float) ($settings?->max_weekly_teaching_hours ?? 30),
            'max_assigned_sections' => $settings?->max_assigned_sections,
            'automatic_attendance_enabled' => (bool) ($settings?->automatic_attendance_enabled ?? false),
            'late_after_minutes' => (int) ($settings?->late_after_minutes ?? 15),
            'check_in_window_minutes' => (int) ($settings?->check_in_window_minutes ?? 30),
            'geofencing_enabled' => (bool) ($settings?->geofencing_enabled ?? true),
            'gps_accuracy_threshold_meters' => (int) ($settings?->gps_accuracy_threshold_meters ?? 30),
            'periods' => StudyPeriod::query()->with('timeSlots')->orderBy('position')->get()->map(fn (StudyPeriod $period): array => [
                'id' => $period->id,
                'code' => $period->code,
                'name' => $period->name,
                'color' => $period->color,
                'position' => $period->position,
                'is_active' => $period->is_active,
                'time_slots' => $period->timeSlots->map(fn (ScheduleTimeSlot $slot): array => [
                    'id' => $slot->id,
                    'code' => $slot->code,
                    'name' => $slot->name,
                    'starts_at' => substr((string) $slot->starts_at, 0, 5),
                    'ends_at' => substr((string) $slot->ends_at, 0, 5),
                    'is_break' => $slot->is_break,
                    'is_active' => $slot->is_active,
                ])->values()->all(),
            ])->all(),
        ];
    }

    /** @param array<string, mixed> $data */
    public function updateSlot(ScheduleTimeSlot $timeSlot, array $data): ScheduleTimeSlot
    {
        return DB::transaction(function () use ($timeSlot, $data): ScheduleTimeSlot {
            $slot = ScheduleTimeSlot::query()->whereKey($timeSlot->id)->lockForUpdate()->firstOrFail();
            $candidate = array_merge($slot->only(['name', 'starts_at', 'ends_at', 'is_active']), $data);
            $start = substr((string) $candidate['starts_at'], 0, 8);
            $end = substr((string) $candidate['ends_at'], 0, 8);
            if ($end <= $start) {
                throw ValidationException::withMessages(['ends_at' => ['End time must be later than start time.']]);
            }

            $overlap = (bool) $candidate['is_active'] && ScheduleTimeSlot::query()
                ->where('is_active', true)
                ->whereKeyNot($slot->id)
                ->where('starts_at', '<', $end)
                ->where('ends_at', '>', $start)
                ->exists();
            if ($overlap) {
                throw ValidationException::withMessages(['starts_at' => ['This time overlaps another session or break in the same study period.']]);
            }

            $schedules = ClassSchedule::query()->where('time_slot_id', $slot->id)->orderBy('id')->lockForUpdate()->get();
            if ($slot->is_break && $schedules->isNotEmpty()) {
                throw ValidationException::withMessages(['time_slot_id' => ['This break has schedules assigned. Move those schedules before changing it.']]);
            }
            if ($slot->is_break && (bool) $candidate['is_active'] && ClassSchedule::query()
                ->where('status', 'active')
                ->whereNull('time_slot_id')
                ->where('start_time', '<', $end)
                ->where('end_time', '>', $start)
                ->exists()) {
                throw ValidationException::withMessages(['starts_at' => ['This break would overlap an existing custom class schedule.']]);
            }

            $slot->fill($data)->save();
            foreach ($schedules as $schedule) {
                $values = [
                    ...$schedule->only(['class_section_id', 'classroom_id', 'time_slot_id', 'day_of_week', 'effective_from', 'effective_until', 'status']),
                    'start_time' => $start,
                    'end_time' => $end,
                ];
                foreach (['effective_from', 'effective_until'] as $key) {
                    if ($values[$key] instanceof \DateTimeInterface) $values[$key] = $values[$key]->format('Y-m-d');
                }
                $this->conflicts->assertValid($values, $schedule->id);
                $schedule->update(['start_time' => $start, 'end_time' => $end]);
            }

            return $slot->refresh()->load('studyPeriod');
        }, 3);
    }

    /** @param array<string, mixed> $data */
    public function updateSettings(array $data): array
    {
        $settings = TimetableSetting::query()->findOrFail(1);
        $settings->fill($data)->save();

        return [
            'max_weekly_teaching_hours' => (float) $settings->max_weekly_teaching_hours,
            'max_assigned_sections' => $settings->max_assigned_sections,
            'automatic_attendance_enabled' => $settings->automatic_attendance_enabled,
            'late_after_minutes' => $settings->late_after_minutes,
            'check_in_window_minutes' => $settings->check_in_window_minutes,
            'geofencing_enabled' => $settings->geofencing_enabled,
            'gps_accuracy_threshold_meters' => $settings->gps_accuracy_threshold_meters,
            'timezone' => $settings->timezone,
        ];
    }
}
