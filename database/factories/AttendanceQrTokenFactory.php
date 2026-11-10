<?php

namespace Database\Factories;

use App\Models\AttendanceQrToken;
use App\Models\AttendanceSession;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<AttendanceQrToken>
 */
class AttendanceQrTokenFactory extends Factory
{
    protected $model = AttendanceQrToken::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'attendance_session_id' => AttendanceSession::factory(),
            'token_hash' => hash('sha256', Str::random(64)),
            'expires_at' => now()->addSeconds(30),
            'revoked_at' => null,
        ];
    }
}
