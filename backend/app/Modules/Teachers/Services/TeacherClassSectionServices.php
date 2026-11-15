<?php

namespace App\Modules\Teachers\Services;

use App\Enums\EnrollmentStatus;
use App\Models\ClassSection;
use App\Models\ClassSchedule;
use App\Models\Teacher;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class TeacherClassSectionServices
{
    /** @param array{status?: string|null, per_page?: int|string|null} $filters */
    public function paginateForTeacher(Teacher $teacher, array $filters = []): LengthAwarePaginator
    {
        return ClassSection::query()
            ->whereHas('teacherAssignments', fn ($query) => $query->where('teacher_id', $teacher->id))
            ->withCount(['enrollments' => fn ($query) => $query->where('status', EnrollmentStatus::Enrolled->value)])
            ->with(['course.department', 'semester.academicYear', 'classSchedules.classroom'])
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->orderBy('section_code')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }

    public function findAssigned(Teacher $teacher, int $sectionId): ClassSection
    {
        return ClassSection::query()
            ->whereKey($sectionId)
            ->whereHas('teacherAssignments', fn ($query) => $query->where('teacher_id', $teacher->id))
            ->withCount(['enrollments' => fn ($query) => $query->where('status', EnrollmentStatus::Enrolled->value)])
            ->with(['course.department', 'semester.academicYear', 'classSchedules.classroom'])
            ->firstOrFail();
    }

    /** @param array{search?: string|null, per_page?: int|string|null} $filters */
    public function roster(Teacher $teacher, int $sectionId, array $filters = []): LengthAwarePaginator
    {
        $section = $this->findAssigned($teacher, $sectionId);

        return $section->enrollments()
            ->with(['student.user'])
            ->where('status', EnrollmentStatus::Enrolled->value)
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->whereHas('student', fn ($student) => $student
                    ->where('student_code', 'ilike', "%{$search}%")
                    ->orWhereHas('user', fn ($user) => $user
                        ->where('name', 'ilike', "%{$search}%")
                        ->orWhere('email', 'ilike', "%{$search}%")));
            })
            ->orderBy('student_id')
            ->paginate((int) ($filters['per_page'] ?? 50))
            ->withQueryString();
    }

    /** @param array{date_from?: string|null, date_to?: string|null} $filters */
    public function schedules(Teacher $teacher, int $sectionId, array $filters = [])
    {
        $this->findAssigned($teacher, $sectionId);

        return ClassSchedule::query()
            ->where('class_section_id', $sectionId)
            ->with('classroom')
            ->when($filters['date_from'] ?? null, fn ($query, string $date) => $query
                ->where(fn ($range) => $range->whereNull('effective_until')->orWhereDate('effective_until', '>=', $date)))
            ->when($filters['date_to'] ?? null, fn ($query, string $date) => $query
                ->where(fn ($range) => $range->whereNull('effective_from')->orWhereDate('effective_from', '<=', $date)))
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();
    }
}
