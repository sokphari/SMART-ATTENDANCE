<?php

namespace App\Modules\Departments\Services;

use App\Enums\DepartmentStatus;
use App\Models\Department;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class DepartmentServices
{
    /**
     * @param  array{search?: string|null, status?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return Department::query()
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $term = '%'.strtolower($search).'%';

                $query->where(function ($query) use ($term): void {
                    $query->whereRaw('LOWER(name) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(code) LIKE ?', [$term]);
                });
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }

    /**
     * @param  array{name: string, code: string, description?: string|null, status?: string|null}  $data
     */
    public function create(array $data): Department
    {
        return Department::create([
            'name' => $data['name'],
            'code' => $data['code'],
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? DepartmentStatus::Active->value,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Department $department, array $data): Department
    {
        $department->fill($data);
        $department->save();

        return $department->refresh();
    }

    public function deactivate(Department $department): void
    {
        $department->update(['status' => DepartmentStatus::Inactive->value]);
    }
}
