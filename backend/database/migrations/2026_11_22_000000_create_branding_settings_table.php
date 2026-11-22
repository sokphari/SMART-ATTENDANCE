<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branding_settings', function (Blueprint $table): void {
            $table->unsignedTinyInteger('id')->primary();
            $table->string('system_name', 80)->default('Smart Attendance');
            $table->string('logo_url', 2048)->nullable();
            $table->string('primary_color', 7)->default('#2563EB');
            $table->timestampsTz();
        });

        DB::table('branding_settings')->insert([
            'id' => 1,
            'system_name' => 'Smart Attendance',
            'logo_url' => null,
            'primary_color' => '#2563EB',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('branding_settings');
    }
};
