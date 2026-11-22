<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            // Only populated by opt-in local ID-only check-in. Prevents the
            // same browser installation from registering multiple students
            // during one session. Not a reliable physical-device identifier.
            $table->char('scan_device_hash', 64)->nullable();
            $table->unique(['attendance_session_id', 'scan_device_hash'], 'attendances_unique_scan_device');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropUnique('attendances_unique_scan_device');
            $table->dropColumn('scan_device_hash');
        });
    }
};
