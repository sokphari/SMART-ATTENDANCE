<?php

namespace App\Jobs;

use App\Models\Attendance;
use App\Modules\Attendance\Services\TelegramAttendanceNotifier;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class NotifyTelegramAttendance implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public function __construct(public readonly int $attendanceId) {}

    public function handle(TelegramAttendanceNotifier $notifier): void
    {
        $attendance = Attendance::query()->find($this->attendanceId);
        if ($attendance !== null) {
            $notifier->notify($attendance);
        }
    }
}
