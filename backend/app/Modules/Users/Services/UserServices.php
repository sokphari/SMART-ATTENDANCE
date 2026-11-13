<?php

namespace App\Modules\Users\Services;

use App\Enums\AccountStatus;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class UserServices
{
    private const LOGIN_MAX_ATTEMPTS = 5;

    private const LOGIN_DECAY_SECONDS = 60;

    /**
     * @param  array{search?: string|null, role?: string|null, status?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return User::query()
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $term = '%'.strtolower($search).'%';

                $query->where(function ($query) use ($term): void {
                    $query->whereRaw('LOWER(name) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$term]);
                });
            })
            ->when($filters['role'] ?? null, fn ($query, string $role) => $query->where('role', $role))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }

    /**
     * @param  array{name: string, email: string, password: string, role: string, status?: string|null}  $data
     */
    public function create(array $data): User
    {
        return User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => $data['role'],
            'status' => $data['status'] ?? AccountStatus::Active->value,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(User $user, array $data): User
    {
        if (array_key_exists('password', $data) && blank($data['password'])) {
            unset($data['password']);
        }

        $user->fill($data);
        $user->save();

        return $user->refresh();
    }

    public function deactivate(User $user): void
    {
        $user->update(['status' => AccountStatus::Inactive->value]);
    }

    /**
     * @param  array{email: string, password: string, device_name?: string|null}  $data
     * @return array{user: User, token: string}
     */
    public function login(array $data, ?string $ip = null): array
    {
        $clientIp = $ip ?? request()->ip();
        $throttleKey = $this->loginThrottleKey($data['email'], $clientIp);

        if (RateLimiter::tooManyAttempts($throttleKey, self::LOGIN_MAX_ATTEMPTS)) {
            AuditLog::create([
                'user_id' => null,
                'action' => 'auth.login_throttled',
                'entity_type' => User::class,
                'entity_id' => null,
                'old_values' => ['email' => $data['email']],
                'new_values' => ['reason' => 'Too many login attempts (rate limit exceeded)'],
                'ip_address' => $clientIp,
                'created_at' => now(),
            ]);

            $this->throwTooManyLoginAttempts($throttleKey);
        }

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            RateLimiter::hit($throttleKey, self::LOGIN_DECAY_SECONDS);

            AuditLog::create([
                'user_id' => $user?->id,
                'action' => 'auth.login_failed',
                'entity_type' => User::class,
                'entity_id' => $user?->id,
                'old_values' => ['email' => $data['email']],
                'new_values' => ['reason' => $user ? 'Incorrect password' : 'User account not found'],
                'ip_address' => $clientIp,
                'created_at' => now(),
            ]);

            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        if (! $user->isActive()) {
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'auth.login_denied',
                'entity_type' => User::class,
                'entity_id' => $user->id,
                'old_values' => [
                    'email' => $user->email,
                    'status' => $user->status instanceof AccountStatus ? $user->status->value : (string) $user->status,
                ],
                'new_values' => ['reason' => 'Account is not active'],
                'ip_address' => $clientIp,
                'created_at' => now(),
            ]);

            throw new AuthorizationException('This account is not active.');
        }

        RateLimiter::clear($throttleKey);

        $token = $user->createToken($data['device_name'] ?? 'api-token')->plainTextToken;

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'auth.login_success',
            'entity_type' => User::class,
            'entity_id' => $user->id,
            'new_values' => [
                'email' => $user->email,
                'name' => $user->name,
                'role' => $user->role instanceof \App\Enums\UserRole ? $user->role->value : (string) $user->role,
            ],
            'ip_address' => $clientIp,
            'created_at' => now(),
        ]);

        return ['user' => $user, 'token' => $token];
    }

    public function logout(User $user): void
    {
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'auth.logout',
            'entity_type' => User::class,
            'entity_id' => $user->id,
            'new_values' => [
                'email' => $user->email,
                'name' => $user->name,
                'role' => $user->role instanceof \App\Enums\UserRole ? $user->role->value : (string) $user->role,
            ],
            'ip_address' => request()->ip(),
            'created_at' => now(),
        ]);

        $token = $user->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }
    }

    private function loginThrottleKey(string $email, string $ip): string
    {
        return Str::transliterate(Str::lower($email).'|'.$ip);
    }

    private function throwTooManyLoginAttempts(string $throttleKey): never
    {
        $seconds = RateLimiter::availableIn($throttleKey);

        throw new ThrottleRequestsException(
            "Too many login attempts. Please try again in {$seconds} seconds.",
            null,
            [
                'Retry-After' => $seconds,
                'X-RateLimit-Limit' => self::LOGIN_MAX_ATTEMPTS,
                'X-RateLimit-Remaining' => 0,
            ]
        );
    }
}
