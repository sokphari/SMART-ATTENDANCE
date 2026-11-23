<?php

namespace App\Modules\Grades\Services;

use App\Enums\AttendanceSessionStatus;
use App\Enums\AttendanceStatus;
use App\Enums\EnrollmentStatus;
use App\Models\AuditLog;
use App\Models\ClassSection;
use App\Models\GradePolicy;
use App\Models\Student;
use App\Models\SubjectGrade;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GradebookService
{
    public function policy(int $semesterId): GradePolicy
    {
        return GradePolicy::query()->firstOrCreate(['semester_id' => $semesterId], [
            'attendance_points' => 10,
            'activities_points' => 10,
            'midterm_points' => 30,
            'final_points' => 50,
            'pass_threshold' => 50,
            'late_credit' => 0.5,
            'permission_credit' => 1,
            'absent_credit' => 0,
            'missing_attendance_policy' => 'exclude',
            'require_all_subjects_pass' => false,
            'max_subject_offerings' => 5,
            'weekly_contact_hours' => 2,
        ]);
    }

    public function sections(array $filters = [], ?Teacher $teacher = null)
    {
        $sections = ClassSection::query()
            ->with(['course.department', 'semester.academicYear', 'teacherAssignments.teacher.user'])
            ->withCount(['enrollments' => fn ($q) => $q->where('status', EnrollmentStatus::Enrolled->value)])
            ->when($filters['semester_id'] ?? null, fn ($q, $id) => $q->where('semester_id', $id))
            ->when($filters['department_id'] ?? null, fn ($q, $id) => $q->whereHas('course', fn ($c) => $c->where('department_id', $id)))
            ->when($teacher, fn ($q) => $q->whereHas('teacherAssignments', fn ($a) => $a->where('teacher_id', $teacher->id)))
            ->orderBy('course_id')->orderBy('section_code')->get();
        return $sections->map(function (ClassSection $section): array {
            $schedule = $section->classSchedules()->where('status', 'active')->get();
            $hours = $schedule->sum(fn ($slot) => max(0, strtotime((string) $slot->end_time) - strtotime((string) $slot->start_time)) / 3600);
            $policy = $this->policy($section->semester_id);
            return [
                'id' => $section->id, 'class_code' => $section->class_code, 'section_code' => $section->section_code, 'department_id' => $section->course->department_id,
                'course' => ['id' => $section->course->id, 'course_code' => $section->course->course_code, 'name' => $section->course->name, 'department' => $section->course->department?->name],
                'semester' => ['id' => $section->semester->id, 'name' => $section->semester->name],
                'enrolled_count' => $section->enrollments_count,
                'weekly_contact_hours' => (float) $policy->weekly_contact_hours,
                'scheduled_weekly_hours' => round($hours, 2),
                'policy' => $policy->only(['attendance_points', 'activities_points', 'midterm_points', 'final_points', 'pass_threshold', 'late_credit', 'permission_credit', 'absent_credit', 'missing_attendance_policy', 'require_all_subjects_pass', 'max_subject_offerings', 'weekly_contact_hours']),
            ];
        });
    }

    public function gradebook(ClassSection $section, array $filters = [])
    {
        return $section->enrollments()->where('status', EnrollmentStatus::Enrolled->value)
            ->with(['student.user', 'student.department', 'student.program'])
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->whereHas('student', fn ($s) => $s
                ->where('student_code', 'ilike', "%{$search}%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'ilike', "%{$search}%"))))
            ->orderBy('student_id')->paginate((int) ($filters['per_page'] ?? 50))->withQueryString()
            ->through(fn ($enrollment) => $this->studentGrade($section, $enrollment->student));
    }

    public function studentGrade(ClassSection $section, Student $student): array
    {
        $policy = $this->policy($section->semester_id);
        $grade = SubjectGrade::query()->firstOrNew(['class_section_id' => $section->id, 'student_id' => $student->id]);
        $attendance = $this->attendanceScore($section, $student, $policy);
        $assessmentScores = [$grade->activities_score, $grade->midterm_score, $grade->final_score];
        $complete = $grade->exists && $grade->finalized && !in_array(null, $assessmentScores, true) && $attendance['score'] !== null;
        $locked = in_array($section->resultPublication?->status, ['approved', 'published'], true);
        if ($locked && $grade->attendance_score_snapshot !== null) $attendance['score'] = (float) $grade->attendance_score_snapshot;
        $total = $locked && $grade->total_score_snapshot !== null
            ? (float) $grade->total_score_snapshot
            : ($complete ? round($attendance['score'] + (float) $grade->activities_score + (float) $grade->midterm_score + (float) $grade->final_score, 2) : null);

        return [
            'student' => ['id' => $student->id, 'name' => $student->user?->name ?? $student->name ?? 'Student', 'email' => $student->user?->email, 'student_code' => $student->student_code],
            'attendance' => $attendance,
            'activities_score' => $grade->activities_score === null ? null : (float) $grade->activities_score,
            'midterm_score' => $grade->midterm_score === null ? null : (float) $grade->midterm_score,
            'final_score' => $grade->final_score === null ? null : (float) $grade->final_score,
            'finalized' => (bool) $grade->finalized,
            'total' => $total,
            'status' => $locked && $grade->result_status_snapshot ? $grade->result_status_snapshot : ($total === null ? 'pending' : ($total >= (float) $policy->pass_threshold ? 'pass' : 'fail')),
            'threshold' => (float) $policy->pass_threshold,
        ];
    }

    public function attendanceScore(ClassSection $section, Student $student, GradePolicy $policy): array
    {
        $section->loadMissing('semester');
        $sessions = $section->attendanceSessions()
            ->where('status', AttendanceSessionStatus::Closed->value)
            ->whereNotNull('closed_at')
            ->whereDate('session_date', '>=', $section->semester->start_date->toDateString())
            ->whereDate('session_date', '<=', $section->semester->end_date->toDateString())
            ->with(['attendances' => fn ($q) => $q->where('student_id', $student->id)])
            ->get();

        $credits = [
            AttendanceStatus::Present->value => 1.0,
            AttendanceStatus::Late->value => (float) $policy->late_credit,
            AttendanceStatus::Excused->value => (float) $policy->permission_credit,
            AttendanceStatus::Absent->value => (float) $policy->absent_credit,
        ];
        $earned = 0.0;
        $counted = 0;
        $excludedMissing = 0;
        foreach ($sessions as $session) {
            $record = $session->attendances->first();
            if (!$record) {
                if ($policy->missing_attendance_policy === 'exclude') { $excludedMissing++; continue; }
                $counted++;
                continue;
            }
            $counted++;
            $status = $record->status instanceof AttendanceStatus ? $record->status->value : (string) $record->status;
            $earned += $credits[$status] ?? 0;
        }

        return [
            'score' => $counted > 0 ? round(($earned / $counted) * (int) $policy->attendance_points, 2) : null,
            'points_possible' => (int) $policy->attendance_points,
            'finalized_sessions' => $sessions->count(),
            'counted_sessions' => $counted,
            'excluded_unrecorded_sessions' => $excludedMissing,
            'policy' => $policy->missing_attendance_policy,
        ];
    }

    public function save(ClassSection $section, Student $student, array $data, User $user, ?string $ip): array
    {
        abort_unless($section->enrollments()->where('student_id', $student->id)->where('status', EnrollmentStatus::Enrolled->value)->exists(), 422, 'Student is not currently enrolled in this class section.');
        $publication = $section->resultPublication;
        abort_if($publication && in_array($publication->status, ['approved', 'published'], true), 423, 'Approved semester results are locked.');
        $policy = $this->policy($section->semester_id);
        $rules = ['activities_score' => ['sometimes', 'nullable', 'numeric', 'min:0'], 'midterm_score' => ['sometimes', 'nullable', 'numeric', 'min:0'], 'final_score' => ['sometimes', 'nullable', 'numeric', 'min:0'], 'finalize' => ['sometimes', 'boolean']];
        $validated = validator($data, $rules)->validate();
        foreach (['activities_score' => 'activities_points', 'midterm_score' => 'midterm_points', 'final_score' => 'final_points'] as $scoreField => $limitField) {
            if (isset($validated[$scoreField]) && (float) $validated[$scoreField] > (float) $policy->{$limitField}) {
                throw ValidationException::withMessages([$scoreField => ["The score cannot exceed {$policy->{$limitField}} points."]]);
            }
        }
        $grade = DB::transaction(function () use ($section, $student, $validated, $user, $ip) {
            $row = SubjectGrade::query()->firstOrNew(['class_section_id' => $section->id, 'student_id' => $student->id]);
            $old = $row->exists ? $row->only(['activities_score', 'midterm_score', 'final_score', 'finalized']) : [];
            foreach (['activities_score', 'midterm_score', 'final_score'] as $field) if (array_key_exists($field, $validated)) $row->{$field} = $validated[$field];
            if (array_key_exists('finalize', $validated)) {
                if ($validated['finalize'] && (in_array(null, [$row->activities_score, $row->midterm_score, $row->final_score], true) || $this->attendanceScore($section, $student, $this->policy($section->semester_id))['score'] === null)) {
                    throw ValidationException::withMessages(['finalize' => ['Enter all assessment scores and record at least one finalized attendance session before finalizing this grade.']]);
                }
                $row->finalized = (bool) $validated['finalize'];
                $row->finalized_at = $row->finalized ? now() : null;
            } elseif ($row->exists && array_intersect(['activities_score', 'midterm_score', 'final_score'], array_keys($validated))) {
                $row->finalized = false;
                $row->finalized_at = null;
            }
            $row->entered_by = $user->id;
            $row->save();
            AuditLog::create(['user_id' => $user->id, 'action' => 'grade.updated', 'entity_type' => 'subject_grade', 'entity_id' => $row->id, 'old_values' => $old, 'new_values' => $row->only(['class_section_id', 'student_id', 'activities_score', 'midterm_score', 'final_score', 'finalized']), 'ip_address' => $ip, 'created_at' => now()]);
            return $row;
        });
        return $this->studentGrade($section, $student);
    }

    public function results(array $filters = [], ?int $studentId = null)
    {
        $sections = ClassSection::query()->with(['course.department', 'semester.academicYear', 'resultPublication'])
            ->when($filters['semester_id'] ?? null, fn ($q, $id) => $q->where('semester_id', $id))
            ->when($filters['department_id'] ?? null, fn ($q, $id) => $q->whereHas('course', fn ($c) => $c->where('department_id', $id)))
            ->when($filters['class_section_id'] ?? null, fn ($q, $id) => $q->whereKey($id))
            ->when($studentId, fn ($q) => $q->whereHas('enrollments', fn ($e) => $e->where('student_id', $studentId)->whereIn('status', [EnrollmentStatus::Enrolled->value, EnrollmentStatus::Completed->value])))
            ->when($studentId !== null, fn ($q) => $q->whereHas('resultPublication', fn ($p) => $p->where('status', 'published')))
            ->orderBy('course_id')->orderBy('section_code')->get();

        return $sections->map(function (ClassSection $section) use ($filters, $studentId) {
            $enrollments = $section->enrollments()->whereIn('status', [EnrollmentStatus::Enrolled->value, EnrollmentStatus::Completed->value])->with('student.user')
                ->when($studentId, fn ($q) => $q->where('student_id', $studentId))
                ->when($filters['search'] ?? null, fn ($q, $search) => $q->whereHas('student.user', fn ($u) => $u->where('name', 'ilike', "%{$search}%")))
                ->get();
            $rows = $enrollments->map(fn ($enrollment) => $this->studentGrade($section, $enrollment->student));
            return ['class_section' => ['id' => $section->id, 'code' => $section->class_code, 'section' => $section->section_code, 'course' => $section->course->name, 'course_code' => $section->course->course_code, 'department_id' => $section->course->department_id, 'department' => $section->course->department?->name, 'semester_id' => $section->semester_id, 'semester' => $section->semester->name, 'publication_status' => $section->resultPublication?->status ?? 'draft'], 'students' => $rows->values()];
        })->values();
    }
}
