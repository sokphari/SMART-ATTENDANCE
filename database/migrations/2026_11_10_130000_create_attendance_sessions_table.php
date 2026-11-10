<?php

use App\Enums\AttendanceSessionStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_section_id')
                ->constrained('class_sections')
                ->restrictOnDelete();
            $table->foreignId('class_schedule_id')
                ->nullable()
                ->constrained('class_schedules')
                ->restrictOnDelete();
            $table->foreignId('teacher_id')
                ->constrained('teachers')
                ->restrictOnDelete();
            $table->foreignId('classroom_id')
                ->constrained('classrooms')
                ->restrictOnDelete();
            $table->date('session_date');
            $table->timestampTz('starts_at');
            $table->timestampTz('late_after');
            $table->timestampTz('closes_at');
            $table->timestampTz('closed_at')->nullable();
            $table->string('status', 20)
                ->default(AttendanceSessionStatus::Scheduled->value)
                ->index();
            $table->decimal('allowed_latitude', 10, 7);
            $table->decimal('allowed_longitude', 10, 7);
            $table->integer('allowed_radius_meters');
            $table->timestampsTz();

            $table->index(['class_section_id', 'session_date']);
            $table->index(['teacher_id', 'starts_at']);
        });

        DB::statement(
            "CREATE UNIQUE INDEX one_open_attendance_session_per_section
             ON attendance_sessions (class_section_id)
             WHERE status = 'open'"
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_sessions');
    }
};
