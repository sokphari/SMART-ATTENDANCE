<?php

namespace App\Modules\ClassSchedules\Services;

use App\Models\ClassSchedule;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ClassScheduleServices
{
    /**
     * @param  array{search?: string|null, class_section_id?: int|string|null, classroom_id?: int|string|null, day_of_week?: int|string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return ClassSchedule::query()
            ->with([
                'classSection.course.department',
                'classSection.semester',
                'classroom',
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
                    });
                });
            })
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
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): ClassSchedule
    {
        $classSchedule = ClassSchedule::create([
            'class_section_id' => $data['class_section_id'],
            'classroom_id' => $data['classroom_id'],
            'day_of_week' => $data['day_of_week'],
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'],
            'effective_from' => $data['effective_from'] ?? null,
            'effective_until' => $data['effective_until'] ?? null,
        ]);

        return $classSchedule->load($this->relations());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ClassSchedule $classSchedule, array $data): ClassSchedule
    {
        $classSchedule->fill($data);
        $classSchedule->save();

        return $classSchedule->refresh()->load($this->relations());
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
            'classSection.semester',
            'classroom',
        ];
    }
}
