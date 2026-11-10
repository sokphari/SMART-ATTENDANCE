<?php

namespace App\Modules\Attendance\Services;

use App\Enums\AttendanceStatus;
use App\Models\Attendance;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class AttendanceServices
{
    /**
     * @param  array{search?: string|null, class_section_id?: int|string|null, attendance_session_id?: int|string|null, student_id?: int|string|null, status?: string|null, date_from?: string|null, date_to?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return Attendance::query()
            ->with([
                'attendanceSession.classSection.course.department',
                'attendanceSession.teacher.user',
                'attendanceSession.classroom',
                'student.user',
                'student.department',
                'markedBy',
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
                $filters['attendance_session_id'] ?? null,
                fn ($query, $sessionId) => $query->where('attendance_session_id', $sessionId)
            )
            ->when(
                $filters['class_section_id'] ?? null,
                fn ($query, $classSectionId) => $query->whereHas(
                    'attendanceSession',
                    fn ($query) => $query->where('class_section_id', $classSectionId)
                )
            )
            ->when(
                $filters['student_id'] ?? null,
                fn ($query, $studentId) => $query->where('student_id', $studentId)
            )
            ->when(
                $filters['status'] ?? null,
                fn ($query, string $status) => $query->where('status', $status)
            )
            ->when(
                $filters['date_from'] ?? null,
                fn ($query, string $dateFrom) => $query->whereHas(
                    'attendanceSession',
                    fn ($query) => $query->whereDate('session_date', '>=', $dateFrom)
                )
            )
            ->when(
                $filters['date_to'] ?? null,
                fn ($query, string $dateTo) => $query->whereHas(
                    'attendanceSession',
                    fn ($query) => $query->whereDate('session_date', '<=', $dateTo)
                )
            )
            ->orderByDesc('id')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }

    /**
     * @param  array{class_section_id?: int|string|null, semester_id?: int|string|null, date_from?: string|null, date_to?: string|null}  $filters
     * @return array<string, mixed>
     */
    public function report(array $filters = []): array
    {
        $base = $this->reportBaseQuery($filters);

        $statusBindings = [
            AttendanceStatus::Present->value,
            AttendanceStatus::Late->value,
            AttendanceStatus::Absent->value,
            AttendanceStatus::Excused->value,
        ];

        $totals = (clone $base)
            ->selectRaw(
                'COUNT(*) as total,
                 SUM(CASE WHEN attendances.status = ? THEN 1 ELSE 0 END) as present,
                 SUM(CASE WHEN attendances.status = ? THEN 1 ELSE 0 END) as late,
                 SUM(CASE WHEN attendances.status = ? THEN 1 ELSE 0 END) as absent,
                 SUM(CASE WHEN attendances.status = ? THEN 1 ELSE 0 END) as excused',
                $statusBindings
            )
            ->first();

        $total = (int) ($totals->total ?? 0);
        $present = (int) ($totals->present ?? 0);
        $late = (int) ($totals->late ?? 0);
        $absent = (int) ($totals->absent ?? 0);
        $excused = (int) ($totals->excused ?? 0);

        $sections = (clone $base)
            ->join('courses', 'class_sections.course_id', '=', 'courses.id')
            ->selectRaw(
                'class_sections.id as class_section_id,
                 class_sections.section_code as section_code,
                 courses.course_code as course_code,
                 COUNT(*) as total,
                 SUM(CASE WHEN attendances.status = ? THEN 1 ELSE 0 END) as present,
                 SUM(CASE WHEN attendances.status = ? THEN 1 ELSE 0 END) as late,
                 SUM(CASE WHEN attendances.status = ? THEN 1 ELSE 0 END) as absent,
                 SUM(CASE WHEN attendances.status = ? THEN 1 ELSE 0 END) as excused',
                $statusBindings
            )
            ->groupBy('class_sections.id', 'class_sections.section_code', 'courses.course_code')
            ->orderBy('class_sections.id')
            ->get()
            ->map(fn ($row) => [
                'class_section_id' => (int) $row->class_section_id,
                'section_code' => $row->section_code,
                'course_code' => $row->course_code,
                'total' => (int) $row->total,
                'present' => (int) $row->present,
                'late' => (int) $row->late,
                'absent' => (int) $row->absent,
                'excused' => (int) $row->excused,
                'attendance_rate' => $this->attendanceRate(
                    (int) $row->present,
                    (int) $row->late,
                    (int) $row->total
                ),
            ])
            ->values()
            ->all();

        return [
            'total' => $total,
            'by_status' => [
                'present' => $present,
                'late' => $late,
                'absent' => $absent,
                'excused' => $excused,
            ],
            'attendance_rate' => $this->attendanceRate($present, $late, $total),
            'by_section' => $sections,
        ];
    }

    /**
     * @param  array{class_section_id?: int|string|null, semester_id?: int|string|null, date_from?: string|null, date_to?: string|null}  $filters
     */
    private function reportBaseQuery(array $filters): Builder
    {
        return DB::table('attendances')
            ->join(
                'attendance_sessions',
                'attendances.attendance_session_id',
                '=',
                'attendance_sessions.id'
            )
            ->join('class_sections', 'attendance_sessions.class_section_id', '=', 'class_sections.id')
            ->when(
                $filters['class_section_id'] ?? null,
                fn ($query, $classSectionId) => $query->where(
                    'attendance_sessions.class_section_id',
                    $classSectionId
                )
            )
            ->when(
                $filters['semester_id'] ?? null,
                fn ($query, $semesterId) => $query->where(
                    'class_sections.semester_id',
                    $semesterId
                )
            )
            ->when(
                $filters['date_from'] ?? null,
                fn ($query, string $dateFrom) => $query->whereDate(
                    'attendance_sessions.session_date',
                    '>=',
                    $dateFrom
                )
            )
            ->when(
                $filters['date_to'] ?? null,
                fn ($query, string $dateTo) => $query->whereDate(
                    'attendance_sessions.session_date',
                    '<=',
                    $dateTo
                )
            );
    }

    private function attendanceRate(int $present, int $late, int $total): float
    {
        if ($total === 0) {
            return 0.0;
        }

        return round((($present + $late) / $total) * 100, 2);
    }
}
