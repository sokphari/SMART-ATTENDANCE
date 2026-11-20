<?php

namespace App\Modules\Courses\Services;

use App\Enums\CourseStatus;
use App\Models\Course;
use App\Models\Program;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;

class CourseServices
{
    /**
     * @param  array{search?: string|null, department_id?: int|string|null, status?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return Course::query()
            ->with(['department', 'program'])
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
        $this->assertProgramDepartment($data['program_id'] ?? null, (int) $data['department_id']);
        $course = Course::create([
            'department_id' => $data['department_id'],
            'program_id' => $data['program_id'] ?? null,
            'course_code' => $data['course_code'],
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'credits' => $data['credits'],
            'status' => $data['status'] ?? CourseStatus::Active->value,
        ]);

        return $course->load(['department', 'program']);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Course $course, array $data): Course
    {
        $this->assertProgramDepartment($data['program_id'] ?? null, (int) ($data['department_id'] ?? $course->department_id));
        $course->fill($data);
        $course->save();

        return $course->refresh()->load(['department', 'program']);
    }

    public function deactivate(Course $course): void
    {
        $course->update(['status' => CourseStatus::Inactive->value]);
    }

    private function assertProgramDepartment(mixed $programId, int $departmentId): void
    {
        if ($programId === null || $programId === '') return;
        if (! Program::query()->whereKey($programId)->where('department_id', $departmentId)->where('status', 'active')->exists()) {
            throw ValidationException::withMessages(['program_id' => ['Select an active program from the selected department.']]);
        }
    }
}
