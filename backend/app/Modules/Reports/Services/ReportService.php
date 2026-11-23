<?php

namespace App\Modules\Reports\Services;

use App\Enums\AttendanceSessionStatus;
use App\Enums\AttendanceStatus;
use App\Enums\EnrollmentStatus;
use App\Models\ClassSection;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Reports use closed attendance sessions joined to the enrollment roster that
 * was effective on the session date. Missing marks remain `unrecorded`.
 * Excused opportunities are reported separately and excluded from the rate;
 * unrecorded opportunities remain in its denominator but are never labeled absent.
 */
class ReportService
{
    private const TIMEZONE = 'Asia/Phnom_Penh';

    /** @return array<string, mixed> */
    public function overview(array $filters = [], ?Teacher $teacher = null): array
    {
        $opportunities = $this->opportunities($filters, $teacher);
        $summary = $this->summarize(clone $opportunities);
        $scope = $this->scopeCounts($filters, $teacher);
        $summary['students'] = $scope['students'];
        $summary['classes'] = $scope['classes'];
        $days = $this->dailyGroups(clone $opportunities);
        $sections = $this->sectionGroups(clone $opportunities);

        return [
            'scope' => [
                'total_students' => $summary['students'],
                'total_classes' => $summary['classes'],
            ],
            'summary' => $summary,
            'attendance_trend' => $days,
            'attendance_distribution' => $this->distribution($summary),
            'by_section' => $sections,
            'calculation' => [
                'timezone' => self::TIMEZONE,
                'rate_denominator' => 'Closed-session enrollment opportunities, excluding excused; unrecorded opportunities remain in the denominator.',
                'unrecorded' => 'No attendance row exists; it is not counted as Absent.',
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function daily(array $filters = [], ?Teacher $teacher = null): array
    {
        $date = $filters['date'] ?? Carbon::now(self::TIMEZONE)->toDateString();
        $filters['date_from'] = $date;
        $filters['date_to'] = $date;
        $query = $this->opportunities($filters, $teacher);
        $summary = $this->summarize(clone $query);
        $rows = $this->paginateRows($query, $filters);

        return ['date' => $date, 'summary' => $summary, ...$rows];
    }

    /** @return array<string, mixed> */
    public function weekly(array $filters = [], ?Teacher $teacher = null): array
    {
        $start = Carbon::parse($filters['week_start'] ?? Carbon::now(self::TIMEZONE)->toDateString(), self::TIMEZONE)
            ->startOfWeek(Carbon::MONDAY);
        $end = $start->copy()->endOfWeek(Carbon::SUNDAY);
        $currentFilters = [...$filters, 'date_from' => $start->toDateString(), 'date_to' => $end->toDateString()];
        $query = $this->opportunities($currentFilters, $teacher);
        $previousStart = $start->copy()->subWeek();
        $previousEnd = $end->copy()->subWeek();
        $previous = $this->summarize($this->opportunities([
            ...$filters,
            'date_from' => $previousStart->toDateString(),
            'date_to' => $previousEnd->toDateString(),
        ], $teacher));

        return [
            'period' => ['from' => $start->toDateString(), 'to' => $end->toDateString()],
            'summary' => $this->summarize(clone $query),
            'daily_trend' => $this->dailyGroups(clone $query, $start, $end),
            'by_section' => $this->sectionGroups(clone $query),
            'previous_week' => [
                'period' => ['from' => $previousStart->toDateString(), 'to' => $previousEnd->toDateString()],
                'summary' => $previous,
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function monthly(array $filters, ?Teacher $teacher = null): array
    {
        $year = (int) ($filters['year'] ?? Carbon::now(self::TIMEZONE)->year);
        $month = (int) ($filters['month'] ?? Carbon::now(self::TIMEZONE)->month);
        $start = Carbon::create($year, $month, 1, 0, 0, 0, self::TIMEZONE)->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $query = $this->opportunities([
            ...$filters,
            'date_from' => $start->toDateString(),
            'date_to' => $end->toDateString(),
        ], $teacher);
        $daily = $this->dailyGroups(clone $query, $start, $end);
        $weekly = [];
        foreach ($daily as $day) {
            $week = (int) ceil((int) Carbon::parse($day['date'], self::TIMEZONE)->day / 7);
            $weekly[$week] ??= ['week' => $week, 'from' => $day['date'], 'to' => $day['date'], 'summary' => $this->emptySummary()];
            $weekly[$week]['to'] = $day['date'];
            $weekly[$week]['summary'] = $this->mergeSummary($weekly[$week]['summary'], $day['summary']);
        }

        return [
            'period' => ['year' => $year, 'month' => $month, 'from' => $start->toDateString(), 'to' => $end->toDateString()],
            'summary' => $this->summarize(clone $query),
            'weekly_breakdown' => array_values($weekly),
            'monthly_trend' => $daily,
            'by_section' => $this->sectionGroups(clone $query),
        ];
    }

    /** @return array<string, mixed> */
    public function student(int $studentId, array $filters = [], ?Teacher $teacher = null): array
    {
        $query = $this->opportunities([...$filters, 'student_id' => $studentId], $teacher);
        if (! $query->exists()) {
            $authorized = ! $teacher && Student::query()->whereKey($studentId)->exists();
            if ($teacher) {
                $authorized = DB::table('enrollments as e')
                    ->join('teacher_assignments as ta', 'ta.class_section_id', '=', 'e.class_section_id')
                    ->where('e.student_id', $studentId)
                    ->whereIn('e.status', [EnrollmentStatus::Enrolled->value, EnrollmentStatus::Completed->value])
                    ->where('ta.teacher_id', $teacher->id)
                    ->exists();
            }
            if (! $authorized) {
                throw new NotFoundHttpException('Student report not found.');
            }
        }
        $student = Student::query()->with(['user', 'department'])->findOrFail($studentId);
        $summary = $this->summarize(clone $query);

        return [
            'student' => ['id' => $student->id, 'name' => $student->user?->name, 'student_code' => $student->student_code, 'department' => $student->department?->name],
            'summary' => $summary,
            'attendance_trend' => $this->dailyGroups(clone $query),
            ...$this->paginateRows($query, $filters),
        ];
    }

    /** @return array<string, mixed> */
    public function classReport(int $classSectionId, array $filters = [], ?Teacher $teacher = null): array
    {
        $sectionQuery = ClassSection::query()
            ->with(['course.department', 'semester.academicYear'])
            ->whereKey($classSectionId);
        if ($teacher) {
            $sectionQuery->whereHas('teacherAssignments', fn ($q) => $q->where('teacher_id', $teacher->id));
        }
        $section = $sectionQuery->firstOrFail();
        $filters['class_section_id'] = $classSectionId;
        $query = $this->opportunities($filters, $teacher);

        $rosterQuery = DB::table('enrollments as e')
            ->where('e.class_section_id', $classSectionId)
            ->whereIn('e.status', [EnrollmentStatus::Enrolled->value, EnrollmentStatus::Completed->value]);
        $enrolledCount = (int) $rosterQuery->distinct('e.student_id')->count('e.student_id');
        $students = (clone $query)
            ->selectRaw("st.id as student_id, st.student_code, su.name as student_name,
                COUNT(*) as opportunities,
                SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as excused,
                SUM(CASE WHEN a.id IS NULL THEN 1 ELSE 0 END) as unrecorded", $this->statusBindings())
            ->groupBy('st.id', 'st.student_code', 'su.name')
            ->orderByDesc('absent')
            ->orderByDesc('late')
            ->orderBy('su.name')
            ->get()
            ->map(fn ($row) => $this->normalizeSummary($row) + [
                'student_id' => (int) $row->student_id,
                'student_code' => $row->student_code,
                'student_name' => $row->student_name,
            ])
            ->values()
            ->all();

        $sessionRows = (clone $query)
            ->selectRaw("s.id as attendance_session_id, s.session_date,
                COUNT(*) as opportunities,
                SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as excused,
                SUM(CASE WHEN a.id IS NULL THEN 1 ELSE 0 END) as unrecorded", $this->statusBindings())
            ->groupBy('s.id', 's.session_date')
            ->orderBy('s.session_date')
            ->get()
            ->map(fn ($row) => ['attendance_session_id' => (int) $row->attendance_session_id, 'date' => $row->session_date, ...$this->normalizeSummary($row)])
            ->all();

        $summary = $this->summarize(clone $query);
        $summary['students_with_repeated_absences'] = count(array_filter($students, fn ($row) => $row['absent'] >= 3));
        $summary['students_with_frequent_late_arrivals'] = count(array_filter($students, fn ($row) => $row['late'] >= 3));

        return [
            'class' => [
                'id' => $section->id,
                'course_code' => $section->course?->course_code,
                'course_name' => $section->course?->name,
                'section_code' => $section->section_code,
                'department' => $section->course?->department?->name,
                'semester' => $section->semester?->name,
                'academic_year' => $section->semester?->academicYear?->name,
                'enrolled_students' => $enrolledCount,
            ],
            'summary' => $summary,
            'students' => $students,
            'sessions' => $sessionRows,
            ...$this->paginateRows($query, $filters),
        ];
    }

    /** Export detail rows from the exact same authorized and filtered opportunity query. */
    public function exportRows(array $filters = [], ?Teacher $teacher = null): array
    {
        return $this->opportunities($filters, $teacher)
            ->select($this->rowColumns())
            ->orderByDesc('s.session_date')
            ->orderBy('su.name')
            ->get()
            ->map(fn ($row) => $this->exportRow($row))
            ->all();
    }

    public function assertTeacherCanViewStudent(Teacher $teacher, int $studentId): void
    {
        $found = DB::table('enrollments as e')
            ->join('teacher_assignments as ta', 'ta.class_section_id', '=', 'e.class_section_id')
            ->where('e.student_id', $studentId)
            ->whereIn('e.status', [EnrollmentStatus::Enrolled->value, EnrollmentStatus::Completed->value])
            ->where('ta.teacher_id', $teacher->id)
            ->exists();
        if (! $found) {
            throw new NotFoundHttpException('Student report not found.');
        }
    }

    public function assertTeacherCanViewClass(Teacher $teacher, int $classSectionId): void
    {
        if (! ClassSection::query()->whereKey($classSectionId)->whereHas('teacherAssignments', fn ($q) => $q->where('teacher_id', $teacher->id))->exists()) {
            throw new NotFoundHttpException('Class report not found.');
        }
    }

    private function opportunities(array $filters = [], ?Teacher $teacher = null): Builder
    {
        return DB::table('attendance_sessions as s')
            ->join('class_sections as cs', 'cs.id', '=', 's.class_section_id')
            ->join('courses as c', 'c.id', '=', 'cs.course_id')
            ->join('semesters as sem', 'sem.id', '=', 'cs.semester_id')
            ->join('enrollments as e', function ($join): void {
                $join->on('e.class_section_id', '=', 'cs.id')
                    ->whereColumn('e.enrollment_date', '<=', 's.session_date')
                    ->whereIn('e.status', [EnrollmentStatus::Enrolled->value, EnrollmentStatus::Completed->value]);
            })
            ->join('students as st', 'st.id', '=', 'e.student_id')
            ->join('users as su', 'su.id', '=', 'st.user_id')
            ->leftJoin('attendances as a', function ($join): void {
                $join->on('a.attendance_session_id', '=', 's.id')->on('a.student_id', '=', 'st.id');
            })
            ->where('s.status', AttendanceSessionStatus::Closed->value)
            ->when($filters['date_from'] ?? null, fn ($q, $date) => $q->whereDate('s.session_date', '>=', $date))
            ->when($filters['date_to'] ?? null, fn ($q, $date) => $q->whereDate('s.session_date', '<=', $date))
            ->when($filters['class_section_id'] ?? null, fn ($q, $id) => $q->where('cs.id', $id))
            ->when($filters['semester_id'] ?? null, fn ($q, $id) => $q->where('cs.semester_id', $id))
            ->when($filters['student_id'] ?? null, fn ($q, $id) => $q->where('st.id', $id))
            ->when($filters['status'] ?? null, function ($q, string $status): void {
                if ($status === 'unrecorded') {
                    $q->whereNull('a.id');
                } else {
                    $q->where('a.status', $status);
                }
            })
            ->when($filters['search'] ?? null, function ($q, string $search): void {
                $pattern = '%'.mb_strtolower($search).'%';
                $q->where(function ($query) use ($pattern): void {
                    $query->whereRaw('LOWER(su.name) LIKE ?', [$pattern])
                        ->orWhereRaw('LOWER(st.student_code) LIKE ?', [$pattern])
                        ->orWhereRaw('LOWER(su.email) LIKE ?', [$pattern]);
                });
            })
            ->when($teacher, fn ($q) => $q->whereExists(
                fn ($assignment) => $assignment->selectRaw('1')
                    ->from('teacher_assignments as ta')
                    ->whereColumn('ta.class_section_id', 'cs.id')
                    ->where('ta.teacher_id', $teacher->id)
            ));
    }

    private function summarize(Builder $query): array
    {
        $row = $query->selectRaw("COUNT(*) as opportunities,
            COUNT(DISTINCT s.id) as sessions,
            COUNT(DISTINCT st.id) as students,
            COUNT(DISTINCT cs.id) as classes,
            COUNT(a.id) as attendance_records,
            SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as late,
            SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as absent,
            SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as excused,
            SUM(CASE WHEN a.id IS NULL THEN 1 ELSE 0 END) as unrecorded", $this->statusBindings())
            ->first();

        return $this->normalizeSummary($row);
    }

    private function normalizeSummary(object|null $row): array
    {
        $opportunities = (int) ($row->opportunities ?? 0);
        $present = (int) ($row->present ?? 0);
        $late = (int) ($row->late ?? 0);
        $absent = (int) ($row->absent ?? 0);
        $excused = (int) ($row->excused ?? 0);
        $unrecorded = (int) ($row->unrecorded ?? 0);
        $denominator = max(0, $opportunities - $excused);

        return [
            'opportunities' => $opportunities,
            'sessions' => (int) ($row->sessions ?? 0),
            'students' => (int) ($row->students ?? 0),
            'classes' => (int) ($row->classes ?? 0),
            'attendance_records' => (int) ($row->attendance_records ?? 0),
            'present' => $present,
            'late' => $late,
            'absent' => $absent,
            'excused' => $excused,
            'unrecorded' => $unrecorded,
            'rate_denominator' => $denominator,
            'attendance_rate' => $denominator === 0 ? null : round((($present + $late) / $denominator) * 100, 2),
        ];
    }

    private function dailyGroups(Builder $query, ?Carbon $from = null, ?Carbon $to = null): array
    {
        $query->selectRaw("s.session_date as report_date,
            COUNT(*) as opportunities,
            COUNT(DISTINCT s.id) as sessions,
            COUNT(a.id) as attendance_records,
            SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as late,
            SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as absent,
            SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as excused,
            SUM(CASE WHEN a.id IS NULL THEN 1 ELSE 0 END) as unrecorded", $this->statusBindings())
            ->groupBy('s.session_date')
            ->orderBy('s.session_date');
        $rows = $query->get()->keyBy('report_date');

        if (! $from || ! $to) {
            return $rows->map(fn ($row) => ['date' => (string) $row->report_date, 'summary' => $this->normalizeSummary($row)])->values()->all();
        }

        $days = [];
        for ($date = $from->copy(); $date->lte($to); $date->addDay()) {
            $row = $rows->get($date->toDateString());
            $days[] = ['date' => $date->toDateString(), 'summary' => $row ? $this->normalizeSummary($row) : $this->emptySummary()];
        }
        return $days;
    }

    private function sectionGroups(Builder $query): array
    {
        return $query->selectRaw("cs.id as class_section_id, cs.section_code, c.course_code, c.name as course_name,
            COUNT(*) as opportunities,
            COUNT(DISTINCT s.id) as sessions,
            COUNT(a.id) as attendance_records,
            SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as late,
            SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as absent,
            SUM(CASE WHEN a.status = ? THEN 1 ELSE 0 END) as excused,
            SUM(CASE WHEN a.id IS NULL THEN 1 ELSE 0 END) as unrecorded", $this->statusBindings())
            ->groupBy('cs.id', 'cs.section_code', 'c.course_code', 'c.name')
            ->orderBy('c.course_code')->orderBy('cs.section_code')
            ->get()
            ->map(fn ($row) => ['class_section_id' => (int) $row->class_section_id, 'section_code' => $row->section_code, 'course_code' => $row->course_code, 'course_name' => $row->course_name, ...$this->normalizeSummary($row)])
            ->all();
    }

    private function distribution(array $summary): array
    {
        return [
            ['status' => 'present', 'count' => $summary['present']],
            ['status' => 'late', 'count' => $summary['late']],
            ['status' => 'absent', 'count' => $summary['absent']],
            ['status' => 'excused', 'count' => $summary['excused']],
            ['status' => 'unrecorded', 'count' => $summary['unrecorded']],
        ];
    }

    /** @return array{students:int, classes:int} */
    private function scopeCounts(array $filters, ?Teacher $teacher): array
    {
        $scope = DB::table('enrollments as e')
            ->join('class_sections as cs', 'cs.id', '=', 'e.class_section_id')
            ->whereIn('e.status', [EnrollmentStatus::Enrolled->value, EnrollmentStatus::Completed->value])
            ->when($filters['class_section_id'] ?? null, fn ($q, $id) => $q->where('cs.id', $id))
            ->when($filters['semester_id'] ?? null, fn ($q, $id) => $q->where('cs.semester_id', $id))
            ->when($teacher, fn ($q) => $q->whereExists(
                fn ($assignment) => $assignment->selectRaw('1')
                    ->from('teacher_assignments as ta')
                    ->whereColumn('ta.class_section_id', 'cs.id')
                    ->where('ta.teacher_id', $teacher->id)
            ));

        $row = $scope->selectRaw('COUNT(DISTINCT e.student_id) as students, COUNT(DISTINCT cs.id) as classes')->first();
        return ['students' => (int) $row->students, 'classes' => (int) $row->classes];
    }

    private function paginateRows(Builder $query, array $filters): array
    {
        $perPage = min(100, max(1, (int) ($filters['per_page'] ?? 25)));
        $sort = in_array($filters['sort_by'] ?? '', ['session_date', 'student_name', 'course_code', 'attendance_status'], true)
            ? $filters['sort_by']
            : 'session_date';
        $direction = ($filters['sort_dir'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $column = match ($sort) {
            'student_name' => 'su.name',
            'course_code' => 'c.course_code',
            'attendance_status' => 'a.status',
            default => 's.session_date',
        };
        $paginator = $query->select($this->rowColumns())->orderBy($column, $direction)->orderBy('su.name')->paginate($perPage)->withQueryString();
        $data = $paginator->getCollection()->map(fn ($row) => $this->exportRow($row));

        return [
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    private function exportRow(object $row): array
    {
        return [
            'date' => (string) $row->session_date,
            'student_id' => (int) $row->student_id,
            'student_code' => $row->student_code,
            'student_name' => $row->student_name,
            'course_code' => $row->course_code,
            'course_name' => $row->course_name,
            'section' => $row->section_code,
            'session_id' => (int) $row->attendance_session_id,
            'status' => $row->attendance_status ?? 'unrecorded',
            'check_in_time' => $row->checked_in_at,
            'method' => $row->verification_method,
            'remarks' => $row->remarks,
        ];
    }

    /** @return list<string> */
    private function rowColumns(): array
    {
        return [
            's.id as attendance_session_id', 's.session_date', 's.status as session_status',
            'cs.id as class_section_id', 'cs.section_code', 'c.course_code', 'c.name as course_name',
            'sem.name as semester_name', 'st.id as student_id', 'st.student_code', 'su.name as student_name',
            'su.email as student_email', 'a.id as attendance_id', 'a.status as attendance_status',
            'a.verification_method', 'a.checked_in_at', 'a.remarks',
        ];
    }

    private function emptySummary(): array
    {
        return $this->normalizeSummary(null);
    }

    private function mergeSummary(array $left, array $right): array
    {
        foreach (['opportunities', 'sessions', 'students', 'classes', 'attendance_records', 'present', 'late', 'absent', 'excused', 'unrecorded'] as $key) {
            $left[$key] += $right[$key] ?? 0;
        }
        $left['rate_denominator'] = max(0, $left['opportunities'] - $left['excused']);
        $left['attendance_rate'] = $left['rate_denominator'] === 0 ? null : round((($left['present'] + $left['late']) / $left['rate_denominator']) * 100, 2);
        return $left;
    }

    private function statusBindings(): array
    {
        return [AttendanceStatus::Present->value, AttendanceStatus::Late->value, AttendanceStatus::Absent->value, AttendanceStatus::Excused->value];
    }
}
