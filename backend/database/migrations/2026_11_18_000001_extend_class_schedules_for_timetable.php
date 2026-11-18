<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('class_schedules', function (Blueprint $table): void {
            $table->foreignId('time_slot_id')->nullable()->after('classroom_id')->constrained('schedule_time_slots')->restrictOnDelete();
            $table->string('status', 20)->default('active')->after('effective_until')->index();
            $table->index(['status', 'day_of_week', 'start_time']);
            $table->index(['time_slot_id', 'day_of_week']);
        });
    }

    public function down(): void
    {
        Schema::table('class_schedules', function (Blueprint $table): void {
            $table->dropIndex(['status', 'day_of_week', 'start_time']);
            $table->dropIndex(['time_slot_id', 'day_of_week']);
            $table->dropConstrainedForeignId('time_slot_id');
            $table->dropColumn('status');
        });
    }
};
