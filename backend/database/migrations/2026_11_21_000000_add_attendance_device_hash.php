<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table): void {
            $table->char('device_hash', 64)->nullable();
            // Only one successful phone registration per session.
            // Multiple NULLs are allowed for teacher/manual and legacy records.
            $table->unique(['attendance_session_id', 'device_hash'], 'attendance_session_device_unique');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table): void {
            $table->dropUnique('attendance_session_device_unique');
            $table->dropColumn('device_hash');
        });
    }
};
