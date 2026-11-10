<?php

use App\Enums\CourseStatus;
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
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')
                ->constrained('departments')
                ->restrictOnDelete();
            $table->string('course_code', 50)->unique();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->smallInteger('credits');
            $table->string('status', 20)
                ->default(CourseStatus::Active->value)
                ->index();
            $table->timestampsTz();

            $table->index('department_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
