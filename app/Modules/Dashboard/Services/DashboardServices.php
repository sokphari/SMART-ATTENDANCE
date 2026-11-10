<?php

namespace App\Modules\Dashboard\Services;

use App\Enums\AccountStatus;
use App\Enums\ClassroomStatus;
use App\Enums\ClassSectionStatus;
use App\Enums\CourseStatus;
use App\Enums\DepartmentStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\UserRole;
use App\Models\Classroom;
use App\Models\ClassSchedule;
use App\Models\ClassSection;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use App\Models\User;

class DashboardServices
{
    /**
     * @return array{counts: array<string, mixed>, trends: array<string, int>}
     */
    public function summary(): array
    {
        $active = AccountStatus::Active->value;
        $since = now()->subDays(30);

        return [
            'counts' => [
                'users' => [
                    'total' => User::count(),
                    'admins' => User::where('role', UserRole::Admin->value)->count(),
                    'teachers' => User::where('role', UserRole::Teacher->value)->count(),
                    'students' => User::where('role', UserRole::Student->value)->count(),
                    'active' => User::where('status', $active)->count(),
                    'inactive' => User::where('status', AccountStatus::Inactive->value)->count(),
                    'suspended' => User::where('status', AccountStatus::Suspended->value)->count(),
                ],
                'departments' => [
                    'total' => Department::count(),
                    'active' => Department::where('status', DepartmentStatus::Active->value)->count(),
                ],
                'students' => [
                    'total' => Student::count(),
                    'active' => Student::whereHas(
                        'user',
                        fn ($query) => $query->where('status', $active)
                    )->count(),
                ],
                'teachers' => [
                    'total' => Teacher::count(),
                    'active' => Teacher::whereHas(
                        'user',
                        fn ($query) => $query->where('status', $active)
                    )->count(),
                ],
                'courses' => [
                    'total' => Course::count(),
                    'active' => Course::where('status', CourseStatus::Active->value)->count(),
                ],
                'class_sections' => [
                    'total' => ClassSection::count(),
                    'active' => ClassSection::where('status', ClassSectionStatus::Active->value)->count(),
                ],
                'classrooms' => [
                    'total' => Classroom::count(),
                    'active' => Classroom::where('status', ClassroomStatus::Active->value)->count(),
                ],
                'teacher_assignments' => [
                    'total' => TeacherAssignment::count(),
                ],
                'enrollments' => [
                    'total' => Enrollment::count(),
                    'enrolled' => Enrollment::where('status', EnrollmentStatus::Enrolled->value)->count(),
                    'dropped' => Enrollment::where('status', EnrollmentStatus::Dropped->value)->count(),
                    'completed' => Enrollment::where('status', EnrollmentStatus::Completed->value)->count(),
                ],
                'class_schedules' => [
                    'total' => ClassSchedule::count(),
                ],
            ],
            'trends' => [
                'students_last_30_days' => Student::where('created_at', '>=', $since)->count(),
                'teachers_last_30_days' => Teacher::where('created_at', '>=', $since)->count(),
                'enrollments_last_30_days' => Enrollment::where('created_at', '>=', $since)->count(),
                'schedules_last_30_days' => ClassSchedule::where('created_at', '>=', $since)->count(),
            ],
        ];
    }
}
