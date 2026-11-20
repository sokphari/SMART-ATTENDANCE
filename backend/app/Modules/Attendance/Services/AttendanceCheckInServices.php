<?php

namespace App\Modules\Attendance\Services;

use App\Jobs\NotifyTelegramAttendance;
use App\Enums\AttendanceStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\VerificationMethod;
use App\Models\Attendance;
use App\Models\AttendanceQrToken;
use App\Models\Enrollment;
use App\Models\Student;
use App\Models\TimetableSetting;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceCheckInServices
{
    /**
     * @param  array{token: string, latitude: float|int|string, longitude: float|int|string, gps_accuracy_meters: float|int|string}  $data
     */
    public function checkIn(Student $student, array $data): Attendance
    {
        $token = AttendanceQrToken::query()
            ->with('attendanceSession')
            ->where('token_hash', hash('sha256', $data['token']))
            ->first();

        if ($token === null || ! $token->isUsable()) {
            throw ValidationException::withMessages([
                'token' => 'The QR token is invalid or has expired.',
            ]);
        }

        $session = $token->attendanceSession;

        if (! $session->isOpen()) {
            throw ValidationException::withMessages([
                'token' => 'The attendance session is not open.',
            ]);
        }

        $now = now();

        if ($now->lt($session->starts_at) || $now->gte($session->closes_at)
            || ($session->session_ends_at !== null && $now->gte($session->session_ends_at))) {
            throw ValidationException::withMessages([
                'token' => 'The attendance session is not active.',
            ]);
        }

        $isEnrolled = Enrollment::query()
            ->where('class_section_id', $session->class_section_id)
            ->where('student_id', $student->id)
            ->where('status', EnrollmentStatus::Enrolled->value)
            ->exists();

        if (! $isEnrolled) {
            abort(403, 'You are not enrolled in this class section.');
        }

        $alreadyCheckedIn = Attendance::query()
            ->where('attendance_session_id', $session->id)
            ->where('student_id', $student->id)
            ->exists();

        if ($alreadyCheckedIn) {
            abort(409, 'Attendance has already been recorded for this session.');
        }

        // Device IDs are scoped to the session and hashed before storage.
        // This prevents a reused browser identity registering another student.
        $deviceHash = isset($data['device_id'])
            ? hash_hmac('sha256', $data['device_id'], (string) config('app.key'))
            : null;
        if ($deviceHash !== null && Attendance::query()
            ->where('attendance_session_id', $session->id)
            ->where('device_hash', $deviceHash)->exists()) {
            abort(409, 'This device has already registered attendance for this session.');
        }

        $settings = TimetableSetting::query()->find(1);
        $geofencingEnabled = $settings?->geofencing_enabled ?? true;
        $latitude = $geofencingEnabled ? (float) $data['latitude'] : null;
        $longitude = $geofencingEnabled ? (float) $data['longitude'] : null;
        $distance = null;

        if ($geofencingEnabled) {
            $distance = $this->distanceInMeters(
                (float) $session->allowed_latitude,
                (float) $session->allowed_longitude,
                $latitude,
                $longitude
            );

            if ($distance > $session->allowed_radius_meters) {
                throw ValidationException::withMessages([
                    'latitude' => 'You are outside the allowed classroom radius.',
                ]);
            }
        }

        $status = $now->lte($session->late_after)
            ? AttendanceStatus::Present
            : AttendanceStatus::Late;

        try {
            $attendance = Attendance::create([
                'attendance_session_id' => $session->id,
                'student_id' => $student->id,
                'status' => $status->value,
                'verification_method' => VerificationMethod::DynamicQr->value,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'gps_accuracy_meters' => $geofencingEnabled ? $data['gps_accuracy_meters'] : null,
                'distance_meters' => $distance !== null ? round($distance, 2) : null,
                'checked_in_at' => $now,
                'marked_by' => null,
                'remarks' => null,
                'device_hash' => $deviceHash,
            ]);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'This student or device has already recorded attendance for this session.');
        }

        if (config('services.telegram_attendance.bot_token') && config('services.telegram_attendance.chat_id')) {
            NotifyTelegramAttendance::dispatch($attendance->id)->afterResponse();
        }

        return $attendance->load([
            'attendanceSession.classSection.course.department',
            'attendanceSession.teacher.user',
            'attendanceSession.classroom',
            'student.user',
            'student.department',
        ]);
    }

    /**
     * Local-only identity-free QR demo. Student IDs are public identifiers,
     * NOT authentication credentials: never enable in staging/production.
     * Unique DB constraints prevent two students using the same browser
     * identifier in the same session, but this is not device attestation.
     *
     * @param array{token:string,student_id:string,device_id:string,latitude?:float|int|string|null,longitude?:float|int|string|null,gps_accuracy_meters?:float|int|string|null} $data
     */
    public function checkInLocalByStudentId(array $data): Attendance
    {
        abort_unless(
            app()->environment('local') && config('attendance.allow_local_id_check_in', false),
            404,
            'Local student ID check-in is disabled.'
        );

        $studentNumber = (int) $data['student_id'];
        $student = Student::query()->find($studentNumber);
        if (! $student || $student->attendanceId() !== $data['student_id']) {
            throw ValidationException::withMessages(['student_id' => 'No student matches this 9-digit ID.']);
        }

        // Serialize the check-in and claim under the session's row lock.
        return DB::transaction(function () use ($data, $student): Attendance {
            $token = AttendanceQrToken::query()->where('token_hash', hash('sha256', $data['token']))->first();
            if (! $token || ! $token->isUsable()) {
                throw ValidationException::withMessages(['token' => 'The QR token is invalid or expired.']);
            }
            \App\Models\AttendanceSession::query()->whereKey($token->attendance_session_id)->lockForUpdate()->firstOrFail();
            $deviceHash = hash('sha256', $data['device_id']);
            if (DB::table('attendance_device_claims')
                ->where('attendance_session_id', $token->attendance_session_id)
                ->where('device_hash', $deviceHash)->exists()) {
                abort(409, 'This device has already checked in for this session.');
            }

            // Reuse enrollment, QR, GPS, active window and duplicate checks.
            $attendance = $this->checkIn($student, $data);
            try {
                DB::table('attendance_device_claims')->insert([
                    'attendance_session_id' => $attendance->attendance_session_id,
                    'student_id' => $student->id,
                    'device_hash' => $deviceHash,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } catch (UniqueConstraintViolationException) {
                abort(409, 'This student or device has already checked in for the session.');
            }
            return $attendance;
        }, 3);
    }

    private function distanceInMeters(
        float $latitudeFrom,
        float $longitudeFrom,
        float $latitudeTo,
        float $longitudeTo
    ): float {
        $earthRadius = 6371000.0;

        $latFrom = deg2rad($latitudeFrom);
        $lonFrom = deg2rad($longitudeFrom);
        $latTo = deg2rad($latitudeTo);
        $lonTo = deg2rad($longitudeTo);

        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;

        $angle = 2 * asin(sqrt(
            (sin($latDelta / 2) ** 2)
            + cos($latFrom) * cos($latTo) * (sin($lonDelta / 2) ** 2)
        ));

        return $earthRadius * $angle;
    }
}
