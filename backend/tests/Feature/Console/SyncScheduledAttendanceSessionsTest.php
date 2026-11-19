<?php

namespace Tests\Feature\Console;

use App\Enums\AttendanceSessionStatus;
use App\Enums\AcademicPeriodStatus;
use App\Models\AttendanceSession;
use App\Models\ClassSchedule;
use App\Models\ClassSection;
use App\Models\Teacher;
use App\Models\TeacherAssignment;
use App\Models\TimetableSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class SyncScheduledAttendanceSessionsTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_automatic_sessions_are_prepared_opened_and_finalized_idempotently(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-18 07:30:00', 'Asia/Phnom_Penh'));
        $settings = TimetableSetting::query()->findOrFail(1);
        $settings->update([
            'automatic_attendance_enabled' => true,
            'late_after_minutes' => 15,
            'check_in_window_minutes' => 30,
        ]);

        $section = ClassSection::factory()->create();
        $section->semester()->update([
            'start_date' => '2026-09-01',
            'end_date' => '2027-06-30',
            'status' => AcademicPeriodStatus::Active,
        ]);
        $teacher = Teacher::factory()->create();
        TeacherAssignment::factory()->create([
            'class_section_id' => $section->id,
            'teacher_id' => $teacher->id,
        ]);
        $schedule = ClassSchedule::factory()->create([
            'class_section_id' => $section->id,
            'day_of_week' => 3,
            'start_time' => '08:00:00',
            'end_time' => '09:30:00',
        ]);

        $this->artisan('attendance:sync-scheduled-sessions')->assertSuccessful();
        $this->assertDatabaseHas('attendance_sessions', [
            'class_schedule_id' => $schedule->id,
            'session_date' => '2026-11-18',
            'status' => AttendanceSessionStatus::Scheduled->value,
        ]);
        $prepared = AttendanceSession::query()->where('class_schedule_id', $schedule->id)->firstOrFail();
        $this->assertSame(30, (int) $prepared->starts_at->diffInMinutes($prepared->closes_at));
        $this->assertSame(90, (int) $prepared->starts_at->diffInMinutes($prepared->session_ends_at));

        Carbon::setTestNow(Carbon::parse('2026-11-18 08:00:00', 'Asia/Phnom_Penh'));
        $this->artisan('attendance:sync-scheduled-sessions')->assertSuccessful();
        $session = AttendanceSession::query()->where('class_schedule_id', $schedule->id)->firstOrFail();
        $this->assertSame(AttendanceSessionStatus::Open, $session->status);

        $this->artisan('attendance:sync-scheduled-sessions')->assertSuccessful();
        $this->assertSame(1, AttendanceSession::query()->where('class_schedule_id', $schedule->id)->count());

        Carbon::setTestNow(Carbon::parse('2026-11-18 09:30:00', 'Asia/Phnom_Penh'));
        $this->artisan('attendance:sync-scheduled-sessions')->assertSuccessful();
        $this->assertDatabaseHas('attendance_sessions', [
            'id' => $session->id,
            'status' => AttendanceSessionStatus::Closed->value,
        ]);
    }
}
