<?php

use App\Enums\ClassSectionStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('class_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')
                ->constrained('courses')
                ->restrictOnDelete();
            $table->foreignId('semester_id')
                ->constrained('semesters')
                ->restrictOnDelete();
            $table->string('section_code', 30);
            $table->integer('capacity');
            $table->string('status', 20)
                ->default(ClassSectionStatus::Active->value)
                ->index();
            $table->timestampsTz();

            $table->unique(['course_id', 'semester_id', 'section_code']);
            $table->index('course_id');
            $table->index('semester_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_sections');
    }
};
