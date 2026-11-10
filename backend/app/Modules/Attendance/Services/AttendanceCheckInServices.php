<?php

namespace App\Modules\Attendance\Services;

use App\Enums\AttendanceStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\VerificationMethod;
use App\Models\Attendance;
use App\Models\AttendanceQrToken;
use App\Models\Enrollment;
use App\Models\Student;
use Illuminate\Database\UniqueConstraintViolationException;
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

        if ($now->lt($session->starts_at) || $now->gt($session->closes_at)) {
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

        $latitude = (float) $data['latitude'];
        $longitude = (float) $data['longitude'];
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
                'gps_accuracy_meters' => $data['gps_accuracy_meters'],
                'distance_meters' => round($distance, 2),
                'checked_in_at' => $now,
                'marked_by' => null,
                'remarks' => null,
            ]);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'Attendance has already been recorded for this session.');
        }

        return $attendance->load([
            'attendanceSession.classSection.course.department',
            'attendanceSession.teacher.user',
            'attendanceSession.classroom',
            'student.user',
            'student.department',
        ]);
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
