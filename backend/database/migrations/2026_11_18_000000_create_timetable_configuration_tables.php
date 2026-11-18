<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('study_periods', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name', 80);
            $table->string('color', 20)->default('blue');
            $table->unsignedSmallInteger('position')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
        });

        Schema::create('schedule_time_slots', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('study_period_id')->constrained()->restrictOnDelete();
            $table->string('code', 40)->unique();
            $table->string('name', 80);
            $table->time('starts_at');
            $table->time('ends_at');
            $table->boolean('is_break')->default(false);
            $table->unsignedSmallInteger('position')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
            $table->index(['study_period_id', 'position']);
        });

        Schema::create('timetable_settings', function (Blueprint $table): void {
            $table->unsignedTinyInteger('id')->primary();
            $table->decimal('max_weekly_teaching_hours', 5, 2)->default(30);
            $table->unsignedSmallInteger('max_assigned_sections')->nullable();
            $table->string('timezone', 64)->default('Asia/Phnom_Penh');
            $table->timestampsTz();
        });

        $now = now();
        DB::table('study_periods')->insert([
            ['code' => 'morning', 'name' => 'Morning', 'color' => 'blue', 'position' => 1, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'afternoon', 'name' => 'Afternoon', 'color' => 'amber', 'position' => 2, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'evening', 'name' => 'Evening', 'color' => 'violet', 'position' => 3, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);

        $periodIds = DB::table('study_periods')->pluck('id', 'code');
        $slots = [
            ['period' => 'morning', 'code' => 'morning-1', 'name' => 'Session 1', 'start' => '07:30:00', 'end' => '09:00:00', 'break' => false, 'position' => 1],
            ['period' => 'morning', 'code' => 'morning-break', 'name' => 'Break', 'start' => '09:00:00', 'end' => '09:15:00', 'break' => true, 'position' => 2],
            ['period' => 'morning', 'code' => 'morning-2', 'name' => 'Session 2', 'start' => '09:15:00', 'end' => '10:45:00', 'break' => false, 'position' => 3],
            ['period' => 'afternoon', 'code' => 'afternoon-1', 'name' => 'Session 1', 'start' => '14:00:00', 'end' => '15:30:00', 'break' => false, 'position' => 1],
            ['period' => 'afternoon', 'code' => 'afternoon-break', 'name' => 'Break', 'start' => '15:30:00', 'end' => '15:45:00', 'break' => true, 'position' => 2],
            ['period' => 'afternoon', 'code' => 'afternoon-2', 'name' => 'Session 2', 'start' => '15:45:00', 'end' => '17:00:00', 'break' => false, 'position' => 3],
            ['period' => 'evening', 'code' => 'evening-1', 'name' => 'Session 1', 'start' => '17:30:00', 'end' => '19:00:00', 'break' => false, 'position' => 1],
            ['period' => 'evening', 'code' => 'evening-break', 'name' => 'Break', 'start' => '19:00:00', 'end' => '19:15:00', 'break' => true, 'position' => 2],
            ['period' => 'evening', 'code' => 'evening-2', 'name' => 'Session 2', 'start' => '19:15:00', 'end' => '20:30:00', 'break' => false, 'position' => 3],
        ];

        DB::table('schedule_time_slots')->insert(array_map(fn (array $slot): array => [
            'study_period_id' => $periodIds[$slot['period']],
            'code' => $slot['code'],
            'name' => $slot['name'],
            'starts_at' => $slot['start'],
            'ends_at' => $slot['end'],
            'is_break' => $slot['break'],
            'position' => $slot['position'],
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ], $slots));

        DB::table('timetable_settings')->insert([
            'id' => 1,
            'max_weekly_teaching_hours' => 30,
            'max_assigned_sections' => null,
            'timezone' => 'Asia/Phnom_Penh',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('timetable_settings');
        Schema::dropIfExists('schedule_time_slots');
        Schema::dropIfExists('study_periods');
    }
};
