<?php

namespace App\Modules\Attendance\Services;

use App\Enums\AttendanceSessionStatus;
use App\Enums\AttendanceStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\VerificationMethod;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\Classroom;
use App\Models\ClassSchedule;
use App\Models\ClassSection;
use App\Models\Enrollment;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use App\Models\User;
use App\Modules\AuditLogs\Services\AuditLogServices;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AttendanceSessionServices
{
    public function __construct(private readonly AuditLogServices $auditLogs) {}

    /**
     * @param  array{status?: string|null, class_section_id?: int|string|null, date_from?: string|null, date_to?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginateForTeacher(Teacher $teacher, array $filters = []): LengthAwarePaginator
    {
        return AttendanceSession::query()
            ->with($this->relations())
            ->where('teacher_id', $teacher->id)
            ->when(
                $filters['status'] ?? null,
                fn ($query, string $status) => $query->where('status', $status)
            )
            ->when(
                $filters['class_section_id'] ?? null,
                fn ($query, $classSectionId) => $query->where('class_section_id', $classSectionId)
            )
            ->when(
                $filters['date_from'] ?? null,
                fn ($query, string $dateFrom) => $query->whereDate('session_date', '>=', $dateFrom)
            )
            ->when(
                $filters['date_to'] ?? null,
                fn ($query, string $dateTo) => $query->whereDate('session_date', '<=', $dateTo)
            )
            ->orderByDesc('starts_at')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function open(Teacher $teacher, array $data): AttendanceSession
    {
        return DB::transaction(fn () => $this->openLocked($teacher, $data), 3);
    }

    /** @param array<string, mixed> $data */
    private function openLocked(Teacher $teacher, array $data): AttendanceSession
    {
        $classSection = ClassSection::findOrFail($data['class_section_id']);

        if (! $classSection->isActive()) {
            throw ValidationException::withMessages([
                'class_section_id' => 'The selected class section is not active.',
            ]);
        }

        $isAssigned = TeacherAssignment::query()
            ->where('class_section_id', $classSection->id)
            ->where('teacher_id', $teacher->id)
            ->exists();

        if (! $isAssigned) {
            abort(403, 'You are not assigned to this class section.');
        }

        $classSchedule = null;

        if (($data['class_schedule_id'] ?? null) !== null) {
            $classSchedule = ClassSchedule::query()->whereKey($data['class_schedule_id'])->lockForUpdate()->firstOrFail();

            if ($classSchedule->class_section_id !== $classSection->id) {
                throw ValidationException::withMessages([
                    'class_schedule_id' => 'The selected schedule does not belong to the class section.',
                ]);
            }

            $sessionDate = Carbon::parse($data['session_date'], 'Asia/Phnom_Penh')->toDateString();
            $weekday = Carbon::parse($sessionDate, 'Asia/Phnom_Penh')->dayOfWeekIso;
            $semester = $classSection->semester()->firstOrFail();
            if ($classSchedule->status?->value !== 'active'
                || $classSchedule->day_of_week !== $weekday
                || $sessionDate < $semester->start_date->toDateString()
                || $sessionDate > $semester->end_date->toDateString()
                || ($classSchedule->effective_from && $sessionDate < $classSchedule->effective_from->toDateString())
                || ($classSchedule->effective_until && $sessionDate > $classSchedule->effective_until->toDateString())) {
                throw ValidationException::withMessages([
                    'class_schedule_id' => 'The selected schedule is not active for this date and weekday.',
                ]);
            }

            if (isset($data['classroom_id']) && (int) $data['classroom_id'] !== (int) $classSchedule->classroom_id) {
                throw ValidationException::withMessages([
                    'classroom_id' => 'The classroom must match the selected class schedule.',
                ]);
            }

            $duplicateScheduleSession = AttendanceSession::query()
                ->where('class_schedule_id', $classSchedule->id)
                ->whereDate('session_date', $sessionDate)
                ->where('status', '!=', AttendanceSessionStatus::Cancelled->value)
                ->exists();
            if ($duplicateScheduleSession) {
                throw ValidationException::withMessages([
                    'class_schedule_id' => 'An attendance session already exists for this schedule and date.',
                ]);
            }
        }

        $classroomId = $data['classroom_id'] ?? $classSchedule?->classroom_id;

        if ($classroomId === null) {
            throw ValidationException::withMessages([
                'classroom_id' => 'A classroom or class schedule is required.',
            ]);
        }

        $classroom = Classroom::findOrFail($classroomId);

        if (! $classroom->isActive()) {
            throw ValidationException::withMessages([
                'classroom_id' => 'The selected classroom is not active.',
            ]);
        }

        $hasOpenSession = AttendanceSession::query()
            ->where('class_section_id', $classSection->id)
            ->where('status', AttendanceSessionStatus::Open->value)
            ->exists();

        if ($hasOpenSession) {
            throw ValidationException::withMessages([
                'class_section_id' => 'An open attendance session already exists for this class section.',
            ]);
        }

        $session = AttendanceSession::create([
            'class_section_id' => $classSection->id,
            'class_schedule_id' => $classSchedule?->id,
            'teacher_id' => $teacher->id,
            'classroom_id' => $classroom->id,
            'session_date' => Carbon::parse($data['session_date'])->toDateString(),
            'starts_at' => Carbon::parse($data['starts_at'])->utc(),
            'late_after' => Carbon::parse($data['late_after'])->utc(),
            'closes_at' => Carbon::parse($data['closes_at'])->utc(),
            'session_ends_at' => Carbon::parse($data['session_ends_at'] ?? $data['closes_at'])->utc(),
            'closed_at' => null,
            'status' => AttendanceSessionStatus::Open->value,
            'allowed_latitude' => $classroom->latitude,
            'allowed_longitude' => $classroom->longitude,
            'allowed_radius_meters' => $classroom->allowed_radius_meters,
        ]);

        return $session->load($this->relations());
    }

    /**
     * Development-only: make a teacher-owned open session scannable for a short
     * test window, without weakening QR validation for normal sessions.
     * This modifies a session, never the timetable or any attendance records.
     */
    public function startLocalQrTest(AttendanceSession $session, Teacher $teacher): AttendanceSession
    {
        abort_unless(
            app()->environment('local') && config('attendance.allow_local_qr_testing', false),
            404,
            'Local QR testing is not enabled.'
        );
        $this->ensureOwnedBy($session, $teacher);

        return DB::transaction(function () use ($session, $teacher): AttendanceSession {
            $locked = AttendanceSession::query()->lockForUpdate()->findOrFail($session->id);
            $this->ensureOwnedBy($locked, $teacher);

            if (! $locked->isOpen()) {
                abort(409, 'Only open attendance sessions can enter local QR test mode.');
            }
            if ($locked->session_date->timezone('Asia/Phnom_Penh')->toDateString() !== now('Asia/Phnom_Penh')->toDateString()) {
                abort(409, 'Local QR test mode is only available for sessions dated today.');
            }

            $now = now();
            $start = $now->copy()->subMinute();
            $cutoff = $now->copy()->addMinutes(15);
            $end = $now->copy()->addMinutes(30);
            $locked->update([
                'starts_at' => $start,
                'late_after' => $cutoff,
                'closes_at' => $end,
                'session_ends_at' => $end,
            ]);
            // Previously issued QR tokens must never survive a new test window.
            $locked->qrTokens()->whereNull('revoked_at')->update(['revoked_at' => $now]);

            return $locked->refresh()->load($this->relations());
        });
    }

    /**
     * @return array{token: string, expires_at: string}
     */
    public function generateQrToken(AttendanceSession $session, Teacher $teacher): array
    {
        $this->ensureOwnedBy($session, $teacher);

        return $this->issueQrToken($session);
    }

    /**
     * Allows authorized admins to project QR codes for existing sessions.
     * Does not grant permission to open a session or bypass its time window.
     *
     * @return array{token: string, expires_at: string}
     */
    public function generateQrTokenForAdmin(AttendanceSession $session): array
    {
        return $this->issueQrToken($session);
    }

    /** @return array{token: string, expires_at: string} */
    private function issueQrToken(AttendanceSession $session): array
    {
        $session->refresh();

        if (! $session->isOpen()) {
            abort(409, 'The attendance session is not open.');
        }

        $now = now();

        if ($now->lt($session->starts_at) || $now->gt($session->closes_at)) {
            abort(409, 'The attendance session is not within its active window.');
        }

        $token = Str::random(64);
        $expiresAt = $now->copy()->addSeconds(30);

        if ($expiresAt->gt($session->closes_at)) {
            $expiresAt = $session->closes_at->copy();
        }

        DB::transaction(function () use ($session, $now, $token, $expiresAt): void {
            $session->qrTokens()
                ->whereNull('revoked_at')
                ->update(['revoked_at' => $now]);

            $session->qrTokens()->create([
                'token_hash' => hash('sha256', $token),
                'expires_at' => $expiresAt,
                'revoked_at' => null,
            ]);
        });

        return [
            'token' => $token,
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    public function close(AttendanceSession $session, Teacher $teacher): AttendanceSession
    {
        $this->ensureOwnedBy($session, $teacher);

        return DB::transaction(function () use ($session, $teacher): AttendanceSession {
            $lockedSession = AttendanceSession::query()->lockForUpdate()->findOrFail($session->id);
            $this->ensureOwnedBy($lockedSession, $teacher);
            if ($lockedSession->status !== AttendanceSessionStatus::Open) {
                abort(409, 'The attendance session is not open.');
            }

            $existingStudentIds = $lockedSession->attendances()->pluck('student_id')->all();

            $missingStudentIds = Enrollment::query()
                ->where('class_section_id', $lockedSession->class_section_id)
                ->where('status', EnrollmentStatus::Enrolled->value)
                ->whereNotIn('student_id', $existingStudentIds)
                ->pluck('student_id');

            foreach ($missingStudentIds as $studentId) {
                Attendance::create([
                    'attendance_session_id' => $lockedSession->id,
                    'student_id' => $studentId,
                    'status' => AttendanceStatus::Absent->value,
                    'verification_method' => VerificationMethod::System->value,
                    'latitude' => null,
                    'longitude' => null,
                    'gps_accuracy_meters' => null,
                    'distance_meters' => null,
                    'checked_in_at' => null,
                    'marked_by' => null,
                    'remarks' => 'Marked absent when the attendance session was closed.',
                ]);
            }

            $lockedSession->update([
                'status' => AttendanceSessionStatus::Closed->value,
                'closed_at' => now(),
            ]);

            return $lockedSession->refresh()->load($this->relations());
        });
    }

    /** @param array{status?: string|null, search?: string|null, per_page?: int|string|null} $filters */
    public function attendanceForTeacher(AttendanceSession $session, Teacher $teacher, array $filters = []): LengthAwarePaginator
    {
        $this->ensureOwnedBy($session, $teacher);

        $query = Enrollment::query()
            ->where('class_section_id', $session->class_section_id)
            ->where('status', EnrollmentStatus::Enrolled->value)
            ->with(['student' => function ($student) use ($session): void {
                $student->with(['user', 'department']);
                $student->with(['attendances' => fn ($attendance) => $attendance->where('attendance_session_id', $session->id)->with('markedBy')]);
            }])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->whereHas('student', fn ($student) => $student
                    ->where('student_code', 'ilike', "%{$search}%")
                    ->orWhereHas('user', fn ($user) => $user
                        ->where('name', 'ilike', "%{$search}%")
                        ->orWhere('email', 'ilike', "%{$search}%")));
            });

        if (($filters['status'] ?? null) === 'unmarked') {
            $query->whereDoesntHave('student.attendances', fn ($attendance) => $attendance->where('attendance_session_id', $session->id));
        } elseif (! empty($filters['status'])) {
            $query->whereHas('student.attendances', fn ($attendance) => $attendance
                ->where('attendance_session_id', $session->id)
                ->where('status', $filters['status']));
        }

        return $query->orderBy('student_id')
            ->paginate((int) ($filters['per_page'] ?? 50))
            ->withQueryString();
    }

    /** @param array{records: list<array{student_id: int, status: string, remarks?: string|null}>} $data */
    public function markAttendanceManually(AttendanceSession $session, Teacher $teacher, User $actor, array $data): AttendanceSession
    {
        $this->ensureOwnedBy($session, $teacher);

        if (! $session->isOpen()) {
            abort(409, 'Attendance for a closed session cannot be changed.');
        }

        return DB::transaction(function () use ($session, $teacher, $actor, $data): AttendanceSession {
            $lockedSession = AttendanceSession::query()->lockForUpdate()->findOrFail($session->id);
            $this->ensureOwnedBy($lockedSession, $teacher);

            if (! $lockedSession->isOpen()) {
                abort(409, 'Attendance for a closed session cannot be changed.');
            }

            $studentIds = array_column($data['records'], 'student_id');
            $enrolledIds = Enrollment::query()
                ->where('class_section_id', $lockedSession->class_section_id)
                ->where('status', EnrollmentStatus::Enrolled->value)
                ->whereIn('student_id', $studentIds)
                ->pluck('student_id')
                ->all();

            if (count($enrolledIds) !== count(array_unique($studentIds))) {
                throw ValidationException::withMessages([
                    'records' => 'Every student must be actively enrolled in this class section.',
                ]);
            }

            $existing = Attendance::query()
                ->where('attendance_session_id', $lockedSession->id)
                ->whereIn('student_id', $studentIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('student_id');

            try {
                foreach ($data['records'] as $record) {
                    $attendance = $existing->get($record['student_id']);
                    $oldValues = $attendance ? [
                        'status' => $attendance->status?->value,
                        'verification_method' => $attendance->verification_method?->value,
                        'remarks' => $attendance->remarks,
                    ] : ['status' => 'unmarked'];
                    $attendance ??= new Attendance([
                        'attendance_session_id' => $lockedSession->id,
                        'student_id' => $record['student_id'],
                    ]);
                    $attendance->fill([
                        'status' => $record['status'],
                        'verification_method' => VerificationMethod::Manual->value,
                        'checked_in_at' => in_array($record['status'], [AttendanceStatus::Present->value, AttendanceStatus::Late->value], true)
                            ? now()
                            : null,
                        'marked_by' => $actor->id,
                        'remarks' => $record['remarks'] ?? null,
                    ]);
                    $attendance->save();

                    $this->auditLogs->record(
                        $oldValues['status'] === 'unmarked' ? 'attendance.manual_marked' : 'attendance.manual_updated',
                        'attendance',
                        $attendance->id,
                        $oldValues,
                        [
                            'status' => $record['status'],
                            'student_id' => $record['student_id'],
                            'attendance_session_id' => $lockedSession->id,
                            'verification_method' => VerificationMethod::Manual->value,
                            'remarks' => $record['remarks'] ?? null,
                        ]
                    );
                }
            } catch (UniqueConstraintViolationException) {
                abort(409, 'An attendance record was added concurrently. Refresh the roster and try again.');
            }

            return $this->loadRelations($lockedSession->refresh());
        });
    }

    /** @return array{present: int, late: int, absent: int, excused: int, unmarked: int, total: int} */
    public function fullAttendanceSummary(AttendanceSession $session): array
    {
        $marked = $this->summary($session);
        $enrolledCount = Enrollment::query()
            ->where('class_section_id', $session->class_section_id)
            ->where('status', EnrollmentStatus::Enrolled->value)
            ->count();
        $unmarked = max(0, $enrolledCount - $marked['total']);

        return [...$marked, 'unmarked' => $unmarked, 'total' => $enrolledCount];
    }

    /**
     * @return array{present: int, late: int, absent: int, excused: int, total: int}
     */
    public function summary(AttendanceSession $session): array
    {
        $counts = $session->attendances()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $present = (int) ($counts[AttendanceStatus::Present->value] ?? 0);
        $late = (int) ($counts[AttendanceStatus::Late->value] ?? 0);
        $absent = (int) ($counts[AttendanceStatus::Absent->value] ?? 0);
        $excused = (int) ($counts[AttendanceStatus::Excused->value] ?? 0);

        return [
            'present' => $present,
            'late' => $late,
            'absent' => $absent,
            'excused' => $excused,
            'total' => $present + $late + $absent + $excused,
        ];
    }

    public function ensureOwnedBy(AttendanceSession $session, Teacher $teacher): void
    {
        if ($session->teacher_id !== $teacher->id) {
            abort(403, 'This attendance session does not belong to you.');
        }
    }

    public function loadRelations(AttendanceSession $session): AttendanceSession
    {
        return $session->load($this->relations());
    }

    /**
     * @return list<string>
     */
    private function relations(): array
    {
        return [
            'classSection.course.department',
            'classSection.semester',
            'teacher.user',
            'teacher.department',
            'classroom',
        ];
    }
}
