<?php

namespace App\Modules\Enrollments\Services;

use App\Enums\EnrollmentStatus;
use App\Models\ClassSection;
use App\Models\Enrollment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EnrollmentServices
{
    /**
     * @param  array{search?: string|null, class_section_id?: int|string|null, student_id?: int|string|null, status?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return Enrollment::query()
            ->with([
                'classSection.course.department',
                'classSection.semester',
                'student.user',
                'student.department',
            ])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $term = '%'.strtolower($search).'%';

                $query->whereHas('student', function ($query) use ($term): void {
                    $query->whereRaw('LOWER(student_code) LIKE ?', [$term])
                        ->orWhereHas('user', function ($query) use ($term): void {
                            $query->whereRaw('LOWER(name) LIKE ?', [$term])
                                ->orWhereRaw('LOWER(email) LIKE ?', [$term]);
                        });
                });
            })
            ->when(
                $filters['class_section_id'] ?? null,
                fn ($query, $classSectionId) => $query->where('class_section_id', $classSectionId)
            )
            ->when(
                $filters['student_id'] ?? null,
                fn ($query, $studentId) => $query->where('student_id', $studentId)
            )
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
    public function create(array $data): Enrollment
    {
        $enrollment = DB::transaction(function () use ($data): Enrollment {
            $section = ClassSection::query()->whereKey($data['class_section_id'])->lockForUpdate()->firstOrFail();
            $status = $data['status'] ?? EnrollmentStatus::Enrolled->value;

            if ($status === EnrollmentStatus::Enrolled->value) {
                $alreadyEnrolled = Enrollment::query()
                    ->where('class_section_id', $section->id)
                    ->where('student_id', $data['student_id'])
                    ->where('status', EnrollmentStatus::Enrolled->value)
                    ->exists();
                $enrolledCount = Enrollment::query()
                    ->where('class_section_id', $section->id)
                    ->where('status', EnrollmentStatus::Enrolled->value)
                    ->count();

                if (! $alreadyEnrolled && $enrolledCount >= $section->capacity) {
                    throw ValidationException::withMessages([
                        'class_section_id' => ['This class section has reached its enrollment capacity.'],
                    ]);
                }
            }

            return Enrollment::create([
                'class_section_id' => $section->id,
                'student_id' => $data['student_id'],
                'enrollment_date' => $data['enrollment_date'] ?? now()->toDateString(),
                'status' => $status,
            ]);
        });

        return $enrollment->load($this->relations());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Enrollment $enrollment, array $data): Enrollment
    {
        $enrollment->fill($data);
        $enrollment->save();

        return $enrollment->refresh()->load($this->relations());
    }

    public function withdraw(Enrollment $enrollment): void
    {
        $enrollment->update(['status' => EnrollmentStatus::Dropped->value]);
    }

    /**
     * @return list<string>
     */
    private function relations(): array
    {
        return [
            'classSection.course.department',
            'classSection.semester',
            'student.user',
            'student.department',
        ];
    }
}
