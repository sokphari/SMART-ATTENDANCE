<?php

namespace App\Modules\AuditLogs\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\AuditLogs\Resources\AuditLogResource;
use App\Modules\AuditLogs\Services\AuditLogServices;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuditLogController extends Controller
{
    public function __construct(private readonly AuditLogServices $auditLogs) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $logs = $this->auditLogs->paginate(
            $request->only([
                'user_id',
                'action',
                'entity_type',
                'entity_id',
                'date_from',
                'date_to',
                'per_page',
            ])
        );

        return AuditLogResource::collection($logs);
    }
}
