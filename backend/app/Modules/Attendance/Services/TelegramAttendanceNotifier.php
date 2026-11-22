<?php

namespace App\Modules\Attendance\Services;

use App\Enums\AttendanceStatus;
use App\Models\Attendance;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramAttendanceNotifier
{
    /**
     * Notify the configured private Telegram chat after a successful student QR
     * check-in. Never include GPS coordinates, QR tokens or student contacts.
     * A Telegram failure must never change a saved attendance record.
     */
    public function notify(Attendance $attendance): void
    {
        $token = config('services.telegram_attendance.bot_token');
        $chatId = config('services.telegram_attendance.chat_id');

        if (! is_string($token) || trim($token) === '' || ! is_scalar($chatId) || (string) $chatId === '') {
            return;
        }

        $attendance->loadMissing(['student.user', 'attendanceSession']);
        $student = $attendance->student;
        $session = $attendance->attendanceSession;

        if ($student === null || $session === null || $attendance->checked_in_at === null) {
            return;
        }

        $studentName = $student->user?->name ?? 'មិនស្គាល់ឈ្មោះ';

        $timezone = 'Asia/Phnom_Penh';
        // The class can continue after QR check-in closes. Prefer the actual
        // end of the scheduled session over the QR scan cutoff.
        $startsAt = $session->starts_at->copy()->timezone($timezone);
        $endsAt = ($session->session_ends_at ?? $session->closes_at)->copy()->timezone($timezone);
        $schedule = $startsAt->format('g:i A').' – '.$endsAt->format('g:i A');
        $date = ($session->session_date ?? $attendance->checked_in_at)->copy()
            ->timezone($timezone)->format('d/m/Y');

        $text = app(TelegramAttendanceMessageFormatter::class)->format(
            studentName: $studentName,
            gender: $student->gender,
            status: $attendance->status?->value ?? 'unknown',
            schedule: $schedule,
            date: $date,
            minutesLate: $attendance->status === AttendanceStatus::Late
                ? $this->minutesAfterLateThreshold($attendance)
                : null,
        );

        try {
            $response = Http::timeout(5)
                ->post('https://api.telegram.org/bot'.$token.'/sendMessage', [
                    'chat_id' => (string) $chatId,
                    'text' => $text,
                    'disable_web_page_preview' => true,
                ]);

            if (! $response->successful()) {
                Log::warning('Telegram attendance notification could not be delivered.', [
                    'attendance_id' => $attendance->id,
                    'http_status' => $response->status(),
                ]);
            }
        } catch (\Throwable $exception) {
            // Never log the token, full request URL, or student identity.
            Log::warning('Telegram attendance notification failed.', [
                'attendance_id' => $attendance->id,
                'error_type' => get_class($exception),
            ]);
        }
    }

    private function minutesAfterLateThreshold(Attendance $attendance): int
    {
        $lateThreshold = $attendance->attendanceSession->late_after;
        $seconds = $attendance->checked_in_at->getTimestamp() - $lateThreshold->getTimestamp();

        // For 'Late', show completed minutes past the configured grace deadline.
        return max(1, (int) ceil(max(0, $seconds) / 60));
    }
}
