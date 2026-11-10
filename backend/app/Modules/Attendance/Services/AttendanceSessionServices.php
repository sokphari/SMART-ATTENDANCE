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
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AttendanceSessionServices
{
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
            $classSchedule = ClassSchedule::findOrFail($data['class_schedule_id']);

            if ($classSchedule->class_section_id !== $classSection->id) {
                throw ValidationException::withMessages([
                    'class_schedule_id' => 'The selected schedule does not belong to the class section.',
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
            'starts_at' => $data['starts_at'],
            'late_after' => $data['late_after'],
            'closes_at' => $data['closes_at'],
            'closed_at' => null,
            'status' => AttendanceSessionStatus::Open->value,
            'allowed_latitude' => $classroom->latitude,
            'allowed_longitude' => $classroom->longitude,
            'allowed_radius_meters' => $classroom->allowed_radius_meters,
        ]);

        return $session->load($this->relations());
    }

    /**
     * @return array{token: string, expires_at: string}
     */
    public function generateQrToken(AttendanceSession $session, Teacher $teacher): array
    {
        $this->ensureOwnedBy($session, $teacher);

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

        if ($session->status !== AttendanceSessionStatus::Open) {
            abort(409, 'The attendance session is not open.');
        }

        DB::transaction(function () use ($session): void {
            $existingStudentIds = $session->attendances()->pluck('student_id')->all();

            $missingStudentIds = Enrollment::query()
                ->where('class_section_id', $session->class_section_id)
                ->where('status', EnrollmentStatus::Enrolled->value)
                ->whereNotIn('student_id', $existingStudentIds)
                ->pluck('student_id');

            foreach ($missingStudentIds as $studentId) {
                Attendance::create([
                    'attendance_session_id' => $session->id,
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

            $session->update([
                'status' => AttendanceSessionStatus::Closed->value,
                'closed_at' => now(),
            ]);
        });

        return $session->refresh()->load($this->relations());
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
