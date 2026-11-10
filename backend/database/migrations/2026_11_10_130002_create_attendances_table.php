<?php

use App\Enums\AttendanceStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_session_id')
                ->constrained('attendance_sessions')
                ->restrictOnDelete();
            $table->foreignId('student_id')
                ->constrained('students')
                ->restrictOnDelete();
            $table->string('status', 20)
                ->default(AttendanceStatus::Present->value)
                ->index();
            $table->string('verification_method', 30);
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->decimal('gps_accuracy_meters', 8, 2)->nullable();
            $table->decimal('distance_meters', 10, 2)->nullable();
            $table->timestampTz('checked_in_at')->nullable();
            $table->foreignId('marked_by')
                ->nullable()
                ->constrained('users')
                ->restrictOnDelete();
            $table->text('remarks')->nullable();
            $table->timestampsTz();

            $table->unique(['attendance_session_id', 'student_id']);
            $table->index(['student_id', 'checked_in_at']);
            $table->index(['attendance_session_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
