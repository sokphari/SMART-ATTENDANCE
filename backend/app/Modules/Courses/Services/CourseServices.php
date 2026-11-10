<?php

namespace App\Modules\Courses\Services;

use App\Enums\CourseStatus;
use App\Models\Course;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CourseServices
{
    /**
     * @param  array{search?: string|null, department_id?: int|string|null, status?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return Course::query()
            ->with('department')
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $term = '%'.strtolower($search).'%';

                $query->where(function ($query) use ($term): void {
                    $query->whereRaw('LOWER(course_code) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(name) LIKE ?', [$term]);
                });
            })
            ->when(
                $filters['department_id'] ?? null,
                fn ($query, $departmentId) => $query->where('department_id', $departmentId)
            )
            ->when(
                $filters['status'] ?? null,
                fn ($query, string $status) => $query->where('status', $status)
            )
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Course
    {
        $course = Course::create([
            'department_id' => $data['department_id'],
            'course_code' => $data['course_code'],
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'credits' => $data['credits'],
            'status' => $data['status'] ?? CourseStatus::Active->value,
        ]);

        return $course->load('department');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Course $course, array $data): Course
    {
        $course->fill($data);
        $course->save();

        return $course->refresh()->load('department');
    }

    public function deactivate(Course $course): void
    {
        $course->update(['status' => CourseStatus::Inactive->value]);
    }
}
