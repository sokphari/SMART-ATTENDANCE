<?php

namespace App\Modules\AuditLogs\Services;

use App\Models\AuditLog;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;

class AuditLogServices
{
    /**
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     */
    public function record(
        string $action,
        string $entityType,
        ?int $entityId,
        ?array $oldValues = null,
        ?array $newValues = null
    ): AuditLog {
        return AuditLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()->ip(),
            'created_at' => now(),
        ]);
    }

    /**
     * @param  array{user_id?: int|string|null, action?: string|null, entity_type?: string|null, entity_id?: int|string|null, date_from?: string|null, date_to?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return AuditLog::query()
            ->with('user')
            ->when(
                $filters['user_id'] ?? null,
                fn ($query, $userId) => $query->where('user_id', $userId)
            )
            ->when(
                $filters['action'] ?? null,
                fn ($query, string $action) => $query->where('action', $action)
            )
            ->when(
                $filters['entity_type'] ?? null,
                fn ($query, string $entityType) => $query->where('entity_type', $entityType)
            )
            ->when(
                $filters['entity_id'] ?? null,
                fn ($query, $entityId) => $query->where('entity_id', $entityId)
            )
            ->when(
                $filters['date_from'] ?? null,
                fn ($query, string $dateFrom) => $query->whereDate('created_at', '>=', $dateFrom)
            )
            ->when(
                $filters['date_to'] ?? null,
                fn ($query, string $dateTo) => $query->whereDate('created_at', '<=', $dateTo)
            )
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }
}
