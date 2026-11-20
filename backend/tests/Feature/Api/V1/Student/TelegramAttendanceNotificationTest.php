<?php

namespace Tests\Feature\Api\V1\Student;

use App\Enums\AttendanceStatus;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\Student;
use App\Modules\Attendance\Services\TelegramAttendanceNotifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TelegramAttendanceNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function configuredNotifier(): TelegramAttendanceNotifier
    {
        config()->set('services.telegram_attendance', [
            'bot_token' => 'test-telegram-bot-token',
            'chat_id' => '-100123456789',
        ]);

        return app(TelegramAttendanceNotifier::class);
    }

    public function test_late_attendance_sends_the_requested_telegram_message(): void
    {
        Http::preventStrayRequests();
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => true], 200)]);
        $notifier = $this->configuredNotifier();

        $student = Student::factory()->create(['gender' => 'male']);
        $student->user->update(['name' => 'Sokha Meas']);
        $session = AttendanceSession::factory()->create([
            'session_date' => '2026-11-20',
            'starts_at' => Carbon::parse('2026-11-20T19:30:00+07:00'),
            'late_after' => Carbon::parse('2026-11-20T19:45:00+07:00'),
            'closes_at' => Carbon::parse('2026-11-20T21:00:00+07:00'),
            'session_ends_at' => Carbon::parse('2026-11-20T22:45:00+07:00'),
        ]);
        $attendance = Attendance::factory()->create([
            'student_id' => $student->id,
            'attendance_session_id' => $session->id,
            'status' => AttendanceStatus::Late,
            'checked_in_at' => Carbon::parse('2026-11-20T19:53:00+07:00'),
        ]);

        $notifier->notify($attendance);

        Http::assertSentCount(1);
        Http::assertSent(function ($request): bool {
            $message = $request->data()['text'] ?? '';
            return $request->url() === 'https://api.telegram.org/bottest-telegram-bot-token/sendMessage'
                && ($request->data()['chat_id'] ?? null) === '-100123456789'
                && str_contains($message, '📌 STUDENT ATTENDANCE NOTIFICATION')
                && str_contains($message, '👤 Student: Sokha Meas')
                && str_contains($message, '⚧ Gender: Male')
                && str_contains($message, '⚠️ Status: Late (8 minutes)')
                && str_contains($message, '🕒 Schedule: 7:30 PM – 10:45 PM')
                && str_contains($message, '📅 Date: 20/11/2026')
                && ! str_contains($message, '11.5564')
                && ! str_contains($message, 'token');
        });
    }

    public function test_present_attendance_has_no_late_minutes(): void
    {
        Http::preventStrayRequests();
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => true], 200)]);
        $notifier = $this->configuredNotifier();
        $attendance = Attendance::factory()->create([
            'status' => AttendanceStatus::Present,
        ]);

        $notifier->notify($attendance);

        Http::assertSent(fn ($request) => str_contains($request->data()['text'], '⚠️ Status: Present'));
    }

    public function test_no_credentials_means_no_telegram_request(): void
    {
        Http::preventStrayRequests();
        Http::fake();
        config()->set('services.telegram_attendance', ['bot_token' => null, 'chat_id' => null]);

        app(TelegramAttendanceNotifier::class)->notify(Attendance::factory()->create());

        Http::assertNothingSent();
    }

    public function test_telegram_failure_does_not_modify_saved_attendance(): void
    {
        Http::preventStrayRequests();
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => false], 503)]);
        $notifier = $this->configuredNotifier();
        $attendance = Attendance::factory()->create(['status' => AttendanceStatus::Present]);

        $notifier->notify($attendance);

        Http::assertSentCount(1);
        $this->assertDatabaseHas('attendances', [
            'id' => $attendance->id,
            'status' => AttendanceStatus::Present->value,
        ]);
    }
}
