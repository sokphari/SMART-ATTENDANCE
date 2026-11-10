<?php

namespace App\Modules\Classrooms\Services;

use App\Enums\ClassroomStatus;
use App\Models\Classroom;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ClassroomServices
{
    /**
     * @param  array{search?: string|null, status?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return Classroom::query()
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $term = '%'.strtolower($search).'%';

                $query->where(function ($query) use ($term): void {
                    $query->whereRaw('LOWER(room_code) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(building) LIKE ?', [$term]);
                });
            })
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
        return Classroom::create([
            'room_code' => $data['room_code'],
            'building' => $data['building'] ?? null,
            'floor' => $data['floor'] ?? null,
            'latitude' => $data['latitude'],
            'longitude' => $data['longitude'],
            'allowed_radius_meters' => $data['allowed_radius_meters'] ?? 100,
            'status' => $data['status'] ?? ClassroomStatus::Active->value,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Classroom $classroom, array $data): Classroom
    {
        $classroom->fill($data);
        $classroom->save();

        return $classroom->refresh();
    }

    public function deactivate(Classroom $classroom): void
    {
        $classroom->update(['status' => ClassroomStatus::Inactive->value]);
    }
}
