<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_module_permissions', function (Blueprint $table): void {
            $table->id();
            $table->string('role', 30);
            $table->string('module', 60);
            $table->boolean('enabled')->default(true);
            $table->timestamps();
            $table->unique(['role', 'module']);
        });

        $now = now();
        foreach (['dashboard', 'classes', 'attendance_sessions', 'attendance_history', 'attendance_reports', 'corrections', 'profile'] as $module) {
            DB::table('role_module_permissions')->insert([
                'role' => 'teacher',
                'module' => $module,
                'enabled' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('role_module_permissions');
    }
};
