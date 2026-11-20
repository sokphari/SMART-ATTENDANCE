<?php

namespace App\Modules\Buildings\Services;

use App\Models\Building;
use App\Models\Floor;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;

class FloorServices
{
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return Floor::query()->with('building')->withCount('classrooms')
            ->when($filters['building_id'] ?? null, fn ($q, $id) => $q->where('building_id', $id))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->orderBy('building_id')->orderBy('floor_number')->orderBy('name')
            ->paginate((int) ($filters['per_page'] ?? 100))->withQueryString();
    }

    public function create(Building $building, array $data): Floor
    {
        if (! $building->isActive()) {
            throw ValidationException::withMessages(['building_id' => ['Choose an active building.']]);
        }
        return $building->floors()->create($data)->load('building')->loadCount('classrooms');
    }

    public function update(Floor $floor, array $data): Floor
    {
        $floor->fill($data)->save();
        return $floor->refresh()->load('building')->loadCount('classrooms');
    }

    public function deactivate(Floor $floor): void
    {
        $floor->update(['status' => 'inactive']);
    }
}
