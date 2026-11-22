<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TestTelegramAttendance extends Command
{
    protected $signature = 'attendance:test-telegram
                            {--status=late : Sample status: present or late}
                            {--minutes=8 : Number of minutes late}
                            {--dry-run : Display the sample message without sending it}';

    protected $description = 'Send a clearly labelled, static attendance test message to the configured Telegram chat (local only).';

    public function handle(): int
    {
        if (! app()->environment('local')) {
            $this->error('Static Telegram tests are allowed only in APP_ENV=local.');
            return self::FAILURE;
        }

        $status = strtolower((string) $this->option('status'));
        if (! in_array($status, ['late', 'present'], true)) {
            $this->error('Status must be "late" or "present".');
            return self::FAILURE;
        }

        $minutes = filter_var($this->option('minutes'), FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1, 'max_range' => 240],
        ]);
        if ($status === 'late' && $minutes === false) {
            $this->error('Minutes must be a whole number between 1 and 240.');
            return self::FAILURE;
        }

        $statusLabel = $status === 'late' ? 'Late ('.$minutes.' minutes)' : 'Present';
        $message = implode("\n", [
            '🧪 TEST ONLY — NOT A REAL CHECK-IN',
            '',
            '📌 STUDENT ATTENDANCE NOTIFICATION',
            '',
            '👤 Student: Test Student',
            '⚧ Gender: Male',
            '⚠️ Status: '.$statusLabel,
            '🕒 Schedule: 7:30 PM – 10:45 PM',
            '📅 Date: '.now('Asia/Phnom_Penh')->format('d/m/Y'),
        ]);

        $this->line($message);

        if ($this->option('dry-run')) {
            $this->info('Dry run completed. No Telegram message was sent and no attendance was recorded.');
            return self::SUCCESS;
        }

        $botToken = config('services.telegram_attendance.bot_token');
        $chatId = config('services.telegram_attendance.chat_id');
        if (! is_string($botToken) || trim($botToken) === '' || ! is_scalar($chatId) || trim((string) $chatId) === '') {
            $this->error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_ATTENDANCE_CHAT_ID in backend .env.');
            return self::FAILURE;
        }

        try {
            $response = Http::timeout(10)->post('https://api.telegram.org/bot'.$botToken.'/sendMessage', [
                'chat_id' => (string) $chatId,
                'text' => $message,
                'disable_web_page_preview' => true,
            ]);

            // Never print the API URL: it contains the secret bot token.
            if (! $response->successful() || $response->json('ok') !== true) {
                $this->error('Telegram rejected the request (HTTP '.$response->status().'). Check bot access, Chat ID and server connectivity.');
                return self::FAILURE;
            }
        } catch (\Throwable $e) {
            $this->error('Could not reach Telegram. Check the container Internet connection and bot configuration.');
            return self::FAILURE;
        }

        $this->info('Telegram confirmed delivery to its chat API. No student or attendance record was changed.');
        return self::SUCCESS;
    }
}
