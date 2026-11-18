<?php

namespace App\Modules\ClassSchedules\Services;

use App\Enums\ClassScheduleStatus;
use App\Models\ClassSchedule;
use App\Models\ScheduleTimeSlot;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ClassScheduleServices
{
    public function __construct(private readonly ScheduleConflictService $conflicts) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        $weekStart = ! empty($filters['week_start'])
            ? CarbonImmutable::parse($filters['week_start'], 'Asia/Phnom_Penh')->startOfWeek(CarbonImmutable::MONDAY)
            : null;

        return ClassSchedule::query()
            ->with([
                'classSection.course.department',
                'classSection.semester.academicYear',
                'classSection.teacherAssignments.teacher.user',
                'classroom',
                'timeSlot.studyPeriod',
            ])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $term = '%'.strtolower($search).'%';

                $query->where(function ($query) use ($term): void {
                    $query->whereHas('classSection', function ($query) use ($term): void {
                        $query->whereRaw('LOWER(section_code) LIKE ?', [$term])
                            ->orWhereHas('course', function ($query) use ($term): void {
                                $query->whereRaw('LOWER(course_code) LIKE ?', [$term])
                                    ->orWhereRaw('LOWER(name) LIKE ?', [$term]);
                            });
                    })->orWhereHas('classroom', function ($query) use ($term): void {
                        $query->whereRaw('LOWER(room_code) LIKE ?', [$term]);
                    })->orWhereHas('classSection.teacherAssignments.teacher.user', function ($query) use ($term): void {
                        $query->whereRaw('LOWER(name) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(email) LIKE ?', [$term]);
                    });
                });
            })
            ->when($filters['teacher_id'] ?? null, fn ($query, $teacherId) => $query->whereHas('classSection.teacherAssignments', fn ($assignment) => $assignment->where('teacher_id', $teacherId)))
            ->when($filters['department_id'] ?? null, fn ($query, $departmentId) => $query->whereHas('classSection.course', fn ($course) => $course->where('department_id', $departmentId)))
            ->when($filters['semester_id'] ?? null, fn ($query, $semesterId) => $query->whereHas('classSection', fn ($section) => $section->where('semester_id', $semesterId)))
            ->when($weekStart, function ($query) use ($weekStart): void {
                $query->where(function ($days) use ($weekStart): void {
                    foreach ([1, 2, 3, 4, 5] as $day) {
                        $occurrenceDate = $weekStart->addDays($day - 1)->toDateString();
                        $days->orWhere(function ($slot) use ($day, $occurrenceDate): void {
                            $slot->where('day_of_week', $day)
                                ->where(fn ($range) => $range->whereNull('effective_from')->orWhereDate('effective_from', '<=', $occurrenceDate))
                                ->where(fn ($range) => $range->whereNull('effective_until')->orWhereDate('effective_until', '>=', $occurrenceDate))
                                ->whereHas('classSection.semester', fn ($semester) => $semester->whereDate('start_date', '<=', $occurrenceDate)->whereDate('end_date', '>=', $occurrenceDate));
                        });
                    }
                });
            })
            ->when($filters['study_period_id'] ?? null, fn ($query, $periodId) => $query->whereHas('timeSlot', fn ($slot) => $slot->where('study_period_id', $periodId)))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when(
                $filters['class_section_id'] ?? null,
                fn ($query, $classSectionId) => $query->where('class_section_id', $classSectionId)
            )
            ->when(
                $filters['classroom_id'] ?? null,
                fn ($query, $classroomId) => $query->where('classroom_id', $classroomId)
            )
            ->when(
                $filters['day_of_week'] ?? null,
                fn ($query, $dayOfWeek) => $query->where('day_of_week', $dayOfWeek)
            )
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): ClassSchedule|array
    {
        return DB::transaction(function () use ($data): ClassSchedule|array {
            $slot = isset($data['time_slot_id']) ? ScheduleTimeSlot::query()->findOrFail($data['time_slot_id']) : null;
            if ($slot) {
                $data['start_time'] = $slot->starts_at;
                $data['end_time'] = $slot->ends_at;
            }
            $days = $data['days_of_week'] ?? [$data['day_of_week']];
            unset($data['days_of_week']);
            $created = [];

            foreach ($days as $day) {
                $row = [
                    'class_section_id' => (int) $data['class_section_id'],
                    'classroom_id' => (int) $data['classroom_id'],
                    'time_slot_id' => $data['time_slot_id'] ?? null,
                    'day_of_week' => (int) $day,
                    'start_time' => $data['start_time'],
                    'end_time' => $data['end_time'],
                    'effective_from' => $data['effective_from'] ?? null,
                    'effective_until' => $data['effective_until'] ?? null,
                    'status' => $data['status'] ?? ClassScheduleStatus::Active->value,
                ];
                $this->conflicts->assertValid($row);
                $created[] = ClassSchedule::create($row)->load($this->relations());
            }

            return count($created) === 1 ? $created[0] : $created;
        }, 3);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ClassSchedule $classSchedule, array $data): ClassSchedule
    {
        return DB::transaction(function () use ($classSchedule, $data): ClassSchedule {
            $locked = ClassSchedule::query()->whereKey($classSchedule->id)->lockForUpdate()->firstOrFail();
            if (! empty($data['time_slot_id'])) {
                $slot = ScheduleTimeSlot::query()->findOrFail($data['time_slot_id']);
                $data['start_time'] = $slot->starts_at;
                $data['end_time'] = $slot->ends_at;
            }
            $candidate = array_merge($locked->only([
                'class_section_id', 'classroom_id', 'time_slot_id', 'day_of_week', 'start_time', 'end_time',
                'effective_from', 'effective_until', 'status',
            ]), $data);
            foreach (['effective_from', 'effective_until'] as $dateField) {
                if ($candidate[$dateField] instanceof \DateTimeInterface) {
                    $candidate[$dateField] = $candidate[$dateField]->format('Y-m-d');
                }
            }
            $this->conflicts->assertValid($candidate, $locked->id);
            $locked->fill($data)->save();

            return $locked->refresh()->load($this->relations());
        }, 3);
    }

    public function setStatus(ClassSchedule $classSchedule, string $status): ClassSchedule
    {
        return $this->update($classSchedule, ['status' => $status]);
    }

    public function delete(ClassSchedule $classSchedule): void
    {
        $classSchedule->delete();
    }

    /**
     * @return list<string>
     */
    private function relations(): array
    {
        return [
            'classSection.course.department',
            'classSection.semester.academicYear',
            'classSection.teacherAssignments.teacher.user',
            'classroom',
            'timeSlot.studyPeriod',
        ];
    }
}
