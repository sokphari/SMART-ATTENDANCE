<?php

namespace App\Modules\Attendance\Services;

use App\Enums\AttendanceCorrectionStatus;
use App\Enums\VerificationMethod;
use App\Models\Attendance;
use App\Models\AttendanceCorrection;
use App\Models\User;
use App\Modules\AuditLogs\Services\AuditLogServices;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceCorrectionServices
{
    public function __construct(private readonly AuditLogServices $auditLogs) {}

    /**
     * @param  array{status?: string|null, attendance_id?: int|string|null, requested_by?: int|string|null, reviewed_by?: int|string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return AttendanceCorrection::query()
            ->with($this->relations())
            ->when(
                $filters['status'] ?? null,
                fn ($query, string $status) => $query->where('status', $status)
            )
            ->when(
                $filters['attendance_id'] ?? null,
                fn ($query, $attendanceId) => $query->where('attendance_id', $attendanceId)
            )
            ->when(
                $filters['requested_by'] ?? null,
                fn ($query, $requestedBy) => $query->where('requested_by', $requestedBy)
            )
            ->when(
                $filters['reviewed_by'] ?? null,
                fn ($query, $reviewedBy) => $query->where('reviewed_by', $reviewedBy)
            )
            ->orderByDesc('id')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }

    /**
     * @param  array{attendance_id: int|string, requested_status: string, reason: string}  $data
     */
    public function create(array $data, User $requester): AttendanceCorrection
    {
        $attendance = Attendance::findOrFail($data['attendance_id']);

        $hasPendingCorrection = AttendanceCorrection::query()
            ->where('attendance_id', $attendance->id)
            ->where('status', AttendanceCorrectionStatus::Pending->value)
            ->exists();

        if ($hasPendingCorrection) {
            throw ValidationException::withMessages([
                'attendance_id' => 'A pending correction already exists for this attendance record.',
            ]);
        }

        return DB::transaction(function () use ($attendance, $data, $requester): AttendanceCorrection {
            try {
                $correction = AttendanceCorrection::create([
                    'attendance_id' => $attendance->id,
                    'requested_by' => $requester->id,
                    'reviewed_by' => null,
                    'reason' => $data['reason'],
                    'requested_status' => $data['requested_status'],
                    'status' => AttendanceCorrectionStatus::Pending->value,
                    'reviewed_at' => null,
                    'review_note' => null,
                ]);
            } catch (UniqueConstraintViolationException) {
                throw ValidationException::withMessages([
                    'attendance_id' => 'A pending correction already exists for this attendance record.',
                ]);
            }

            $this->auditLogs->record(
                'attendance_correction.requested',
                'attendance_correction',
                $correction->id,
                ['attendance_status' => $attendance->status->value],
                [
                    'requested_status' => $data['requested_status'],
                    'reason' => $data['reason'],
                ]
            );

            return $correction->load($this->relations());
        });
    }

    /**
     * @param  array{status: string, review_note?: string|null}  $data
     */
    public function review(AttendanceCorrection $correction, array $data, User $reviewer): AttendanceCorrection
    {
        return DB::transaction(function () use ($correction, $data, $reviewer): AttendanceCorrection {
            $correction = AttendanceCorrection::query()
                ->with('attendance')
                ->lockForUpdate()
                ->findOrFail($correction->id);

            if (! $correction->isPending()) {
                abort(409, 'This correction has already been reviewed.');
            }

            $attendance = $correction->attendance;
            $oldAttendanceStatus = $attendance->status->value;
            $decision = $data['status'];

            if ($decision === AttendanceCorrectionStatus::Approved->value) {
                $attendance->update([
                    'status' => $correction->requested_status->value,
                    'verification_method' => VerificationMethod::Manual->value,
                    'marked_by' => $reviewer->id,
                ]);
            }

            $correction->update([
                'status' => $decision,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
                'review_note' => $data['review_note'] ?? null,
            ]);

            $this->auditLogs->record(
                'attendance_correction.'.$decision,
                'attendance_correction',
                $correction->id,
                [
                    'correction_status' => AttendanceCorrectionStatus::Pending->value,
                    'attendance_status' => $oldAttendanceStatus,
                ],
                [
                    'correction_status' => $decision,
                    'attendance_status' => $decision === AttendanceCorrectionStatus::Approved->value
                        ? $correction->requested_status->value
                        : $oldAttendanceStatus,
                    'review_note' => $data['review_note'] ?? null,
                ]
            );

            return $correction->refresh()->load($this->relations());
        });
    }

    public function loadRelations(AttendanceCorrection $correction): AttendanceCorrection
    {
        return $correction->load($this->relations());
    }

    /**
     * @return list<string>
     */
    private function relations(): array
    {
        return [
            'attendance.attendanceSession.classSection.course.department',
            'attendance.attendanceSession.classroom',
            'attendance.student.user',
            'attendance.student.department',
            'requestedBy',
            'reviewedBy',
        ];
    }
}
