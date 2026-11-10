<?php

namespace App\Modules\Teachers\Services;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class TeacherServices
{
    /**
     * @param  array{search?: string|null, department_id?: int|string|null, status?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return Teacher::query()
            ->with(['user', 'department'])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $term = '%'.strtolower($search).'%';

                $query->where(function ($query) use ($term): void {
                    $query->whereRaw('LOWER(teacher_code) LIKE ?', [$term])
                        ->orWhereHas('user', function ($query) use ($term): void {
                            $query->whereRaw('LOWER(name) LIKE ?', [$term])
                                ->orWhereRaw('LOWER(email) LIKE ?', [$term]);
                        });
                });
            })
            ->when(
                $filters['department_id'] ?? null,
                fn ($query, $departmentId) => $query->where('department_id', $departmentId)
            )
            ->when(
                $filters['status'] ?? null,
                fn ($query, string $status) => $query->whereHas(
                    'user',
                    fn ($query) => $query->where('status', $status)
                )
            )
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Teacher
    {
        return DB::transaction(function () use ($data): Teacher {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => UserRole::Teacher->value,
                'status' => $data['status'] ?? AccountStatus::Active->value,
            ]);

            $teacher = Teacher::create([
                'user_id' => $user->id,
                'department_id' => $data['department_id'],
                'teacher_code' => $data['teacher_code'],
                'phone' => $data['phone'] ?? null,
            ]);

            return $teacher->load(['user', 'department']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Teacher $teacher, array $data): Teacher
    {
        return DB::transaction(function () use ($teacher, $data): Teacher {
            $userData = array_intersect_key($data, array_flip(['name', 'email', 'status']));

            if (array_key_exists('password', $data) && filled($data['password'])) {
                $userData['password'] = $data['password'];
            }

            if ($userData !== []) {
                $teacher->user->fill($userData)->save();
            }

            $profileData = array_intersect_key(
                $data,
                array_flip(['department_id', 'teacher_code', 'phone'])
            );

            if ($profileData !== []) {
                $teacher->fill($profileData)->save();
            }

            return $teacher->refresh()->load(['user', 'department']);
        });
    }

    public function deactivate(Teacher $teacher): void
    {
        $teacher->user->update(['status' => AccountStatus::Inactive->value]);
    }
}
