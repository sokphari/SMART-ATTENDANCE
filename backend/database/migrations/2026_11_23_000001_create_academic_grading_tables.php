<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grade_policies', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('semester_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('attendance_points')->default(10);
            $table->unsignedSmallInteger('activities_points')->default(10);
            $table->unsignedSmallInteger('midterm_points')->default(30);
            $table->unsignedSmallInteger('final_points')->default(50);
            $table->decimal('pass_threshold', 5, 2)->default(50);
            $table->decimal('late_credit', 4, 3)->default(0.5);
            $table->decimal('permission_credit', 4, 3)->default(1);
            $table->decimal('absent_credit', 4, 3)->default(0);
            $table->string('missing_attendance_policy', 20)->default('exclude');
            $table->boolean('require_all_subjects_pass')->default(false);
            $table->unsignedSmallInteger('max_subject_offerings')->default(5);
            $table->decimal('weekly_contact_hours', 4, 2)->default(2);
            $table->timestamps();
        });

        Schema::create('subject_grades', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('class_section_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->decimal('activities_score', 5, 2)->nullable();
            $table->decimal('midterm_score', 5, 2)->nullable();
            $table->decimal('final_score', 5, 2)->nullable();
            $table->decimal('attendance_score_snapshot', 5, 2)->nullable();
            $table->decimal('total_score_snapshot', 5, 2)->nullable();
            $table->string('result_status_snapshot', 20)->nullable();
            $table->boolean('finalized')->default(false);
            $table->foreignId('entered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('finalized_at')->nullable();
            $table->timestamps();
            $table->unique(['class_section_id', 'student_id']);
        });

        Schema::create('semester_result_publications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('class_section_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('draft');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('approved_at')->nullable();
            $table->foreignId('published_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('published_at')->nullable();
            $table->timestamps();
        });

        \Illuminate\Support\Facades\DB::table('role_module_permissions')->updateOrInsert(
            ['role' => 'teacher', 'module' => 'grades'],
            ['enabled' => true, 'created_at' => now(), 'updated_at' => now()],
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('semester_result_publications');
        Schema::dropIfExists('subject_grades');
        Schema::dropIfExists('grade_policies');
    }
};
