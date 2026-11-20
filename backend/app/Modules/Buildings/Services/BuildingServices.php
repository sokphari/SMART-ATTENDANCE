<?php

namespace App\Modules\Buildings\Services;

use App\Models\Building;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class BuildingServices
{
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return Building::query()->withCount('floors')
            ->when($filters['search'] ?? null, function ($q, string $search): void {
                $term = '%'.strtolower($search).'%';
                $q->where(fn ($query) => $query->whereRaw('LOWER(code) LIKE ?', [$term])->orWhereRaw('LOWER(name) LIKE ?', [$term]));
            })
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->orderBy('name')->paginate((int) ($filters['per_page'] ?? 15))->withQueryString();
    }

    public function create(array $data): Building
    {
        return Building::create($data)->loadCount('floors');
    }

    public function update(Building $building, array $data): Building
    {
        $building->fill($data)->save();
        return $building->refresh()->loadCount('floors');
    }

    public function deactivate(Building $building): void
    {
        $building->update(['status' => 'inactive']);
    }
}
