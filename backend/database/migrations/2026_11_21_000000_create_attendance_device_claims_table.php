<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_device_claims', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('attendance_session_id')->constrained('attendance_sessions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            // Device identifier is generated client-side and stored only as SHA-256.
            $table->char('device_hash', 64);
            $table->timestampsTz();
            $table->unique(['attendance_session_id', 'student_id']);
            $table->unique(['attendance_session_id', 'device_hash']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_device_claims');
    }
};
