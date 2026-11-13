<?php

namespace App\Modules\Notifications\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = max(1, min((int) ($request->query('limit', 25)), 100));
        $category = (string) $request->query('category', 'all');
        $unreadSince = $request->query('unread_since');
        $cacheKey = implode(':', [
            'notifications',
            'v1',
            'user',
            $request->user()->getAuthIdentifier(),
            'limit',
            $limit,
            'category',
            sha1($category),
            'unread',
            sha1((string) $unreadSince),
        ]);

        $payload = Cache::remember($cacheKey, now()->addSeconds(10), function () use ($category, $limit, $unreadSince): array {
            return $this->buildPayload($category, $limit, $unreadSince);
        });

        return response()->json($payload);
    }

    /**
     * Build the notification response payload. Cached by index() because the
     * same user polls this endpoint frequently while the dropdown is open.
     *
     * @return array{data: array<int, array<string, mixed>>, meta: array{total: int, unread_count: int, last_updated: string}}
     */
    private function buildPayload(string $category, int $limit, mixed $unreadSince): array
    {

        $query = AuditLog::query()
            ->select([
                'id',
                'user_id',
                'action',
                'entity_type',
                'old_values',
                'new_values',
                'ip_address',
                'created_at',
            ])
            ->with('user:id,name,email,role');

        if ($category === 'auth') {
            $query->where('action', 'like', 'auth.%');
        } elseif ($category === 'attendance') {
            $query->where('action', 'like', 'attendance.%');
        } elseif ($category === 'system') {
            $query->where('action', 'not like', 'auth.%')
                ->where('action', 'not like', 'attendance.%');
        }

        $logs = $query->orderBy('id', 'desc')->limit($limit)->get();

        $unreadCount = 0;
        if ($unreadSince) {
            $unreadCount = AuditLog::query()
                ->where('created_at', '>', $unreadSince)
                ->count();
        } else {
            $unreadCount = AuditLog::query()
                ->where('created_at', '>=', now()->subHours(24))
                ->count();
        }

        $notifications = $logs->map(function (AuditLog $log): array {
            $action = $log->action;
            $oldValues = (array) ($log->old_values ?? []);
            $newValues = (array) ($log->new_values ?? []);
            $ip = $log->ip_address;

            $category = 'system';
            $level = 'info';
            $title = ucwords(str_replace(['.', '_'], ' ', $action));
            $message = 'Activity on '.class_basename($log->entity_type ?? 'Record');

            if (Str::startsWith($action, 'auth.')) {
                $category = 'auth';
                switch ($action) {
                    case 'auth.login_success':
                        $level = 'success';
                        $role = ucfirst((string) ($newValues['role'] ?? $log->user?->role?->value ?? 'user'));
                        $userName = $newValues['name'] ?? $log->user?->name ?? 'User';
                        $title = "{$role} Signed In";
                        $message = "{$userName} ({$role}) successfully signed in".($ip ? " from {$ip}" : '');
                        break;

                    case 'auth.login_failed':
                        $level = 'error';
                        $email = $oldValues['email'] ?? 'unknown email';
                        $reason = $newValues['reason'] ?? 'Invalid credentials';
                        $title = 'Login Failed Attempt';
                        $message = "Failed sign-in attempt for {$email}: {$reason}".($ip ? " (IP: {$ip})" : '');
                        break;

                    case 'auth.login_throttled':
                        $level = 'warning';
                        $email = $oldValues['email'] ?? 'unknown email';
                        $title = 'Login Throttled';
                        $message = "Multiple failed sign-in attempts for {$email}. Temporarily blocked".($ip ? " (IP: {$ip})" : '');
                        break;

                    case 'auth.login_denied':
                        $level = 'warning';
                        $email = $oldValues['email'] ?? 'unknown email';
                        $title = 'Login Denied';
                        $message = "Access denied for inactive account {$email}".($ip ? " (IP: {$ip})" : '');
                        break;

                    case 'auth.logout':
                        $level = 'info';
                        $userName = $newValues['name'] ?? $log->user?->name ?? 'User';
                        $title = 'User Signed Out';
                        $message = "{$userName} signed out of the system".($ip ? " from {$ip}" : '');
                        break;

                    default:
                        $title = 'Authentication Event';
                        $message = "Security event: {$action}";
                }
            } elseif (Str::startsWith($action, 'attendance.')) {
                $category = 'attendance';
                $level = 'info';
                if (str_contains($action, 'approved')) {
                    $level = 'success';
                    $title = 'Correction Approved';
                    $message = 'Attendance correction request was approved.';
                } elseif (str_contains($action, 'rejected')) {
                    $level = 'error';
                    $title = 'Correction Rejected';
                    $message = 'Attendance correction request was rejected.';
                } else {
                    $title = 'Attendance Update';
                    $message = "Attendance event: {$action}";
                }
            }

            return [
                'id' => "notif-{$log->id}",
                'action' => $action,
                'category' => $category,
                'level' => $level,
                'title' => $title,
                'message' => $message,
                'ip_address' => $ip,
                'created_at' => $log->created_at?->toISOString() ?? now()->toISOString(),
                'metadata' => [
                    'role' => $newValues['role'] ?? $log->user?->role?->value,
                ],
            ];
        });

        return [
            'data' => $notifications,
            'meta' => [
                'total' => $notifications->count(),
                'unread_count' => $unreadCount,
                'last_updated' => now()->toISOString(),
            ],
        ];
    }
}
