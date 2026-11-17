<?php

namespace App\Modules\Students\Services;

use App\Enums\AccountStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\UserRole;
use App\Models\Student;
use App\Models\Department;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StudentServices
{
    public function __construct(private readonly StudentClassAllocationService $allocation) {}

    /**
     * @param  array{search?: string|null, department_id?: int|string|null, status?: string|null, year_level?: int|string|null, gender?: string|null, per_page?: int|string|null}  $filters
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
                $filters['gender'] ?? null,
                fn ($query, string $gender) => $query->where('gender', $gender)
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
            $department = Department::query()
                ->whereKey($data['department_id'])
                ->lockForUpdate()
                ->first();

            if (! $department?->isActive()) {
                throw ValidationException::withMessages([
                    'department_id' => ['Choose an active department.'],
                ]);
            }

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
                'gender' => $data['gender'] ?? null,
            ]);

            if (($data['status'] ?? AccountStatus::Active->value) === AccountStatus::Active->value) {
                $allocation = $this->allocation->allocate($student, $department);
                $student->setAttribute('registration_section_created', $allocation['created_section']);
            }

            return $student->load([
                'user',
                'department',
                'enrollments' => fn ($query) => $query->where('status', EnrollmentStatus::Enrolled->value)
                    ->with(['classSection.course.department', 'classSection.semester.academicYear']),
            ]);
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
                array_flip(['department_id', 'student_code', 'year_level', 'phone', 'gender'])
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

    public function generateStudentCode(): string
    {
        do {
            $code = 'STU-'.now()->format('Y').'-'.Str::upper(Str::random(6));
        } while (Student::query()->where('student_code', $code)->exists());

        return $code;
    }
}
