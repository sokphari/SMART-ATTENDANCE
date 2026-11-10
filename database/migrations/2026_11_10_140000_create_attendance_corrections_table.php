<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_corrections', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('attendance_id')->constrained()->restrictOnDelete();
            $table->foreignId('requested_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->text('reason');
            $table->string('requested_status', 20);
            $table->string('status', 20)->default('pending');
            $table->timestampTz('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestampsTz();

            $table->index(['status', 'created_at']);
        });

        DB::statement(
            "CREATE UNIQUE INDEX one_pending_correction_per_attendance
             ON attendance_corrections(attendance_id)
             WHERE status = 'pending'"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_corrections');
    }
};
