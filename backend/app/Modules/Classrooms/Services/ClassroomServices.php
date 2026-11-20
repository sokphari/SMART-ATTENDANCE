<?php

namespace App\Modules\Classrooms\Services;

use App\Enums\ClassroomStatus;
use App\Models\Classroom;
use App\Models\Floor;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;

class ClassroomServices
{
    /**
     * @param  array{search?: string|null, status?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return Classroom::query()->with(['floorRecord.building'])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $term = '%'.strtolower($search).'%';

                $query->where(function ($query) use ($term): void {
                    $query->whereRaw('LOWER(room_code) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(building) LIKE ?', [$term])
                        ->orWhereHas('floorRecord.building', fn ($building) => $building->whereRaw('LOWER(name) LIKE ?', [$term]));
                });
            })
            ->when($filters['floor_id'] ?? null, fn ($query, $id) => $query->where('floor_id', $id))
            ->when($filters['building_id'] ?? null, fn ($query, $id) => $query->whereHas('floorRecord', fn ($floor) => $floor->where('building_id', $id)))
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
    public function create(array $data): Classroom
    {
        if (! empty($data['floor_id'])) {
            $floor = Floor::query()->with('building')->findOrFail($data['floor_id']);
            $data['building'] = $floor->building->name;
            $data['floor'] = $floor->name;
        }
        return Classroom::create([
            'room_code' => $data['room_code'],
            'building' => $data['building'] ?? null,
            'floor' => $data['floor'] ?? null,
            'floor_id' => $data['floor_id'] ?? null,
            'capacity' => $data['capacity'] ?? 35,
            'room_type' => $data['room_type'] ?? 'classroom',
            'latitude' => $data['latitude'] ?? null,
            'longitude' => $data['longitude'] ?? null,
            'allowed_radius_meters' => $data['allowed_radius_meters'] ?? 100,
            'status' => $data['status'] ?? ClassroomStatus::Active->value,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Classroom $classroom, array $data): Classroom
    {
        if (array_key_exists('floor_id', $data)) {
            $floor = $data['floor_id'] ? Floor::query()->with('building')->findOrFail($data['floor_id']) : null;
            $data['building'] = $floor?->building?->name;
            $data['floor'] = $floor?->name;
        }
        if (array_key_exists('capacity', $data)) {
            $largestAssignedClass = $classroom->classSchedules()->with('classSection')->get()->max('classSection.capacity') ?? 0;
            if ($data['capacity'] < $largestAssignedClass) {
                throw ValidationException::withMessages(['capacity' => ["Capacity cannot be less than the assigned section capacity ({$largestAssignedClass})."]]);
            }
        }
        $classroom->fill($data);
        $classroom->save();

        return $classroom->refresh();
    }

    public function deactivate(Classroom $classroom): void
    {
        $classroom->update(['status' => ClassroomStatus::Inactive->value]);
    }
}
