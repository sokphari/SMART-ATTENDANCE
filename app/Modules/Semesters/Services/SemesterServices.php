<?php

namespace App\Modules\Semesters\Services;

use App\Enums\AcademicPeriodStatus;
use App\Models\Semester;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class SemesterServices
{
    /**
     * @param  array{search?: string|null, academic_year_id?: int|string|null, status?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return Semester::query()
            ->with('academicYear')
            ->when(
                $filters['academic_year_id'] ?? null,
                fn ($query, $academicYearId) => $query->where('academic_year_id', $academicYearId)
            )
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->whereRaw('LOWER(name) LIKE ?', ['%'.strtolower($search).'%']);
            })
            ->orderByDesc('start_date')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }

    /**
     * @param  array{academic_year_id: int, name: string, start_date: string, end_date: string, status?: string|null}  $data
     */
    public function create(array $data): Semester
    {
        return Semester::create([
            'academic_year_id' => $data['academic_year_id'],
            'name' => $data['name'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'status' => $data['status'] ?? AcademicPeriodStatus::Upcoming->value,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Semester $semester, array $data): Semester
    {
        $semester->fill($data);
        $semester->save();

        return $semester->refresh();
    }

    public function delete(Semester $semester): void
    {
        $semester->delete();
    }
}
