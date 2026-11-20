<?php

namespace App\Modules\Attendance\Services;

use App\Models\Attendance;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramAttendanceNotifier
{
    /**
     * Send a minimal attendance event to a configured Telegram chat.
     * Never include a student's GPS coordinates, token, or private contact details.
     * Telegram is optional and notification delivery must not affect check-in.
     */
    public function notify(Attendance $attendance): void
    {
        $config = config('services.telegram_attendance');
        $token = $config['bot_token'] ?? null;
        $chatId = $config['chat_id'] ?? null;

        if (! is_string($token) || $token === '' || ! is_string($chatId) || $chatId === '') {
            return;
        }

        $attendance->loadMissing(['attendanceSession.classSection.course']);
        $class = $attendance->attendanceSession?->classSection;
        $course = $class?->course;
        $courseName = $course?->name ?? 'Class';
        $status = $attendance->status?->value ?? 'present';

        // Telegram text uses plain strings. Never interpolate the bot token into logs.
        $text = implode("\n", [
            'Smart Attendance',
            'Class: '.$courseName,
            'Section: '.($class?->section_code ?? '-'),
            'Status: '.ucfirst($status),
            'Attendance record #'.$attendance->id,
        ]);

        try {
            $response = Http::timeout(4)
                ->retry(1, 200)
                ->post('https://api.telegram.org/bot'.$token.'/sendMessage', [
                    'chat_id' => $chatId,
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
            Log::warning('Telegram attendance notification failed.', [
                'attendance_id' => $attendance->id,
                'error_type' => get_class($exception),
            ]);
        }
    }
}
