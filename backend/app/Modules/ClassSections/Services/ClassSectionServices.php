<?php

namespace App\Modules\ClassSections\Services;

use App\Enums\ClassSectionStatus;
use App\Models\ClassSection;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ClassSectionServices
{
    /**
     * @param  array{search?: string|null, course_id?: int|string|null, semester_id?: int|string|null, status?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return ClassSection::query()
            ->with(['course.department', 'semester'])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $term = '%'.strtolower($search).'%';

                $query->where(function ($query) use ($term): void {
                    $query->whereRaw('LOWER(section_code) LIKE ?', [$term])
                        ->orWhereHas('course', function ($query) use ($term): void {
                            $query->whereRaw('LOWER(course_code) LIKE ?', [$term])
                                ->orWhereRaw('LOWER(name) LIKE ?', [$term]);
                        });
                });
            })
            ->when(
                $filters['course_id'] ?? null,
                fn ($query, $courseId) => $query->where('course_id', $courseId)
            )
            ->when(
                $filters['semester_id'] ?? null,
                fn ($query, $semesterId) => $query->where('semester_id', $semesterId)
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
    public function create(array $data): ClassSection
    {
        $classSection = ClassSection::create([
            'course_id' => $data['course_id'],
            'semester_id' => $data['semester_id'],
            'section_code' => $data['section_code'],
            'capacity' => $data['capacity'],
            'status' => $data['status'] ?? ClassSectionStatus::Active->value,
        ]);

        return $classSection->load(['course.department', 'semester']);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ClassSection $classSection, array $data): ClassSection
    {
        $classSection->fill($data);
        $classSection->save();

        return $classSection->refresh()->load(['course.department', 'semester']);
    }

    public function deactivate(ClassSection $classSection): void
    {
        $classSection->update(['status' => ClassSectionStatus::Inactive->value]);
    }
}
