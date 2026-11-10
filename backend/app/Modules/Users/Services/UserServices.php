<?php

namespace App\Modules\Users\Services;

use App\Enums\AccountStatus;
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
        $throttleKey = $this->loginThrottleKey($data['email'], $ip ?? request()->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, self::LOGIN_MAX_ATTEMPTS)) {
            $this->throwTooManyLoginAttempts($throttleKey);
        }

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            RateLimiter::hit($throttleKey, self::LOGIN_DECAY_SECONDS);

            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        if (! $user->isActive()) {
            throw new AuthorizationException('This account is not active.');
        }

        RateLimiter::clear($throttleKey);

        $token = $user->createToken($data['device_name'] ?? 'api-token')->plainTextToken;

        return ['user' => $user, 'token' => $token];
    }

    public function logout(User $user): void
    {
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
