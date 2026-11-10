<?php

namespace App\Modules\AcademicYears\Services;

use App\Enums\AcademicPeriodStatus;
use App\Models\AcademicYear;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class AcademicYearServices
{
    /**
     * @param  array{search?: string|null, status?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return AcademicYear::query()
            ->withCount('semesters')
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->whereRaw('LOWER(name) LIKE ?', ['%'.strtolower($search).'%']);
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->orderByDesc('start_date')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }

    /**
     * @param  array{name: string, start_date: string, end_date: string, status?: string|null}  $data
     */
    public function create(array $data): AcademicYear
    {
        return AcademicYear::create([
            'name' => $data['name'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'status' => $data['status'] ?? AcademicPeriodStatus::Upcoming->value,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(AcademicYear $academicYear, array $data): AcademicYear
    {
        $academicYear->fill($data);
        $academicYear->save();

        return $academicYear->refresh();
    }

    public function delete(AcademicYear $academicYear): void
    {
        if ($academicYear->semesters()->exists()) {
            throw new ConflictHttpException('Cannot delete an academic year that has semesters.');
        }

        $academicYear->delete();
    }
}
