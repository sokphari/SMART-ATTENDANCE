<?php

namespace Tests\Feature\Console;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TestTelegramAttendanceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        app()->detectEnvironment(fn () => 'local');
        config()->set('services.telegram_attendance.bot_token', 'fake-static-test-token');
        config()->set('services.telegram_attendance.chat_id', '-100123456789');
        Http::preventStrayRequests();
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => true, 'result' => ['message_id' => 1]], 200)]);
    }

    public function test_dry_run_does_not_send_or_create_attendance(): void
    {
        $this->artisan('attendance:test-telegram', ['--dry-run' => true])
            ->assertSuccessful();
        Http::assertNothingSent();
    }

    public function test_static_late_message_uses_expected_format(): void
    {
        $this->artisan('attendance:test-telegram', ['--status' => 'late', '--minutes' => '8'])
            ->assertSuccessful();

        Http::assertSentCount(1);
        Http::assertSent(function ($request): bool {
            $text = (string) $request['text'];
            return $request->url() === 'https://api.telegram.org/botfake-static-test-token/sendMessage'
                && $request['chat_id'] === '-100123456789'
                && str_contains($text, '🧪 សាកល្បងប៉ុណ្ណោះ — មិនមែនជាការស្រង់វត្តមានពិតប្រាកដទេ')
                && str_contains($text, '📌 ដំណឹងវត្តមានសិស្ស')
                && str_contains($text, '👤 សិស្ស៖ Test Student')
                && str_contains($text, '⚧ ភេទ៖ ប្រុស')
                && str_contains($text, '⚠️ ស្ថានភាព៖ យឺត (៨ នាទី)')
                && str_contains($text, '🕒 ម៉ោងសិក្សា៖ 7:30 PM – 10:45 PM')
                && str_contains($text, '📅 កាលបរិច្ឆេទ៖');
        });
    }

    public function test_present_message(): void
    {
        $this->artisan('attendance:test-telegram', ['--status' => 'present'])
            ->assertSuccessful();
        Http::assertSent(fn ($request) => str_contains((string) $request['text'], '⚠️ ស្ថានភាព៖ មានវត្តមាន'));
    }

    public function test_bad_status_is_rejected(): void
    {
        $this->artisan('attendance:test-telegram', ['--status' => 'absent'])
            ->assertFailed();
        Http::assertNothingSent();
    }

    public function test_missing_token_returns_failure_without_request(): void
    {
        config()->set('services.telegram_attendance.bot_token', null);
        $this->artisan('attendance:test-telegram')->assertFailed();
        Http::assertNothingSent();
    }

    public function test_telegram_rejection_returns_failure(): void
    {
        // Reset the HTTP facade because the setUp success fake would otherwise
        // match first and mask this intentionally rejected response.
        Http::swap(new \Illuminate\Http\Client\Factory());
        Http::preventStrayRequests();
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => false], 403)]);
        $this->artisan('attendance:test-telegram')->assertFailed();
        Http::assertSentCount(1);
    }

    public function test_test_command_is_disabled_outside_local_environment(): void
    {
        app()->detectEnvironment(fn () => 'production');
        $this->artisan('attendance:test-telegram')->assertFailed();
        Http::assertNothingSent();
    }
}
