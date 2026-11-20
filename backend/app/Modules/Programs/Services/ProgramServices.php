<?php

namespace App\Modules\Programs\Services;

use App\Models\Program;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ProgramServices
{
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return Program::query()->with('department')
            ->when($filters['department_id'] ?? null, fn ($q, $id) => $q->where('department_id', $id))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['search'] ?? null, function ($q, string $search): void {
                $term = '%'.strtolower($search).'%';
                $q->where(fn ($query) => $query->whereRaw('LOWER(code) LIKE ?', [$term])->orWhereRaw('LOWER(name) LIKE ?', [$term]));
            })
            ->orderBy('name')->paginate((int) ($filters['per_page'] ?? 15))->withQueryString();
    }

    public function create(array $data): Program
    {
        return Program::create($data)->load('department');
    }

    public function update(Program $program, array $data): Program
    {
        $program->fill($data)->save();
        return $program->refresh()->load('department');
    }

    public function deactivate(Program $program): void
    {
        $program->update(['status' => 'inactive']);
    }
}
