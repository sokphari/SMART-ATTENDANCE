<?php

namespace App\Modules\Students\Services;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Student;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class StudentServices
{
    /**
     * @param  array{search?: string|null, department_id?: int|string|null, status?: string|null, year_level?: int|string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return Student::query()
            ->with(['user', 'department'])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $term = '%'.strtolower($search).'%';

                $query->where(function ($query) use ($term): void {
                    $query->whereRaw('LOWER(student_code) LIKE ?', [$term])
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
                $filters['year_level'] ?? null,
                fn ($query, $yearLevel) => $query->where('year_level', $yearLevel)
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
    public function create(array $data): Student
    {
        return DB::transaction(function () use ($data): Student {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => UserRole::Student->value,
                'status' => $data['status'] ?? AccountStatus::Active->value,
            ]);

            $student = Student::create([
                'user_id' => $user->id,
                'department_id' => $data['department_id'],
                'student_code' => $data['student_code'],
                'year_level' => $data['year_level'],
                'phone' => $data['phone'] ?? null,
            ]);

            return $student->load(['user', 'department']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Student $student, array $data): Student
    {
        return DB::transaction(function () use ($student, $data): Student {
            $userData = array_intersect_key($data, array_flip(['name', 'email', 'status']));

            if (array_key_exists('password', $data) && filled($data['password'])) {
                $userData['password'] = $data['password'];
            }

            if ($userData !== []) {
                $student->user->fill($userData)->save();
            }

            $profileData = array_intersect_key(
                $data,
                array_flip(['department_id', 'student_code', 'year_level', 'phone'])
            );

            if ($profileData !== []) {
                $student->fill($profileData)->save();
            }

            return $student->refresh()->load(['user', 'department']);
        });
    }

    public function deactivate(Student $student): void
    {
        $student->user->update(['status' => AccountStatus::Inactive->value]);
    }
}
