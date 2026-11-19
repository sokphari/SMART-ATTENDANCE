<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('timetable_settings', function (Blueprint $table): void {
            $table->boolean('automatic_attendance_enabled')->default(false);
            $table->unsignedSmallInteger('late_after_minutes')->default(15);
            $table->unsignedSmallInteger('check_in_window_minutes')->default(30);
            $table->boolean('geofencing_enabled')->default(true);
            $table->unsignedSmallInteger('gps_accuracy_threshold_meters')->default(30);
        });

        Schema::table('attendance_sessions', function (Blueprint $table): void {
            $table->timestampTz('session_ends_at')->nullable()->after('closes_at');
        });

        DB::table('attendance_sessions')->whereNull('session_ends_at')->update([
            'session_ends_at' => DB::raw('closes_at'),
        ]);
    }

    public function down(): void
    {
        Schema::table('attendance_sessions', function (Blueprint $table): void {
            $table->dropColumn('session_ends_at');
        });

        Schema::table('timetable_settings', function (Blueprint $table): void {
            $table->dropColumn([
                'automatic_attendance_enabled',
                'late_after_minutes',
                'check_in_window_minutes',
                'geofencing_enabled',
                'gps_accuracy_threshold_meters',
            ]);
        });
    }
};
