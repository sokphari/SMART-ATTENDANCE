<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('programs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('department_id')->constrained()->restrictOnDelete();
            $table->string('code', 40)->unique();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->string('status', 20)->default('active')->index();
            $table->timestampsTz();
            $table->index(['department_id', 'status']);
        });

        Schema::create('buildings', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name', 150)->unique();
            $table->text('description')->nullable();
            $table->string('status', 20)->default('active')->index();
            $table->timestampsTz();
        });

        Schema::create('floors', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('building_id')->constrained()->restrictOnDelete();
            $table->smallInteger('floor_number')->nullable();
            $table->string('name', 80);
            $table->string('status', 20)->default('active')->index();
            $table->timestampsTz();
            $table->unique(['building_id', 'name']);
            $table->index(['building_id', 'status']);
        });

        Schema::table('teachers', function (Blueprint $table): void {
            $table->text('qualifications')->nullable();
        });

        Schema::table('courses', function (Blueprint $table): void {
            $table->foreignId('program_id')->nullable()->constrained()->restrictOnDelete();
            $table->index('program_id');
        });

        Schema::table('students', function (Blueprint $table): void {
            $table->foreignId('program_id')->nullable()->constrained()->restrictOnDelete();
            $table->index('program_id');
        });

        Schema::table('class_sections', function (Blueprint $table): void {
            $table->foreignId('program_id')->nullable()->constrained()->restrictOnDelete();
            $table->index('program_id');
            $table->string('class_code', 120)->nullable()->unique();
            $table->smallInteger('year_level')->nullable();
            $table->date('class_start_date')->nullable();
            $table->date('class_end_date')->nullable();
        });

        Schema::table('classrooms', function (Blueprint $table): void {
            $table->foreignId('floor_id')->nullable()->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('capacity')->default(35);
            $table->string('room_type', 50)->default('classroom');
            $table->index(['floor_id', 'status']);
        });

        $this->backfillLegacyClassrooms();
        $this->backfillClassCodes();
    }

    public function down(): void
    {
        Schema::table('classrooms', function (Blueprint $table): void {
            $table->dropIndex(['floor_id', 'status']);
            $table->dropConstrainedForeignId('floor_id');
            $table->dropColumn(['capacity', 'room_type']);
        });

        Schema::table('class_sections', function (Blueprint $table): void {
            $table->dropUnique(['class_code']);
            $table->dropIndex(['program_id']);
            $table->dropConstrainedForeignId('program_id');
            $table->dropColumn(['class_code', 'year_level', 'class_start_date', 'class_end_date']);
        });

        Schema::table('students', function (Blueprint $table): void {
            $table->dropIndex(['program_id']);
            $table->dropConstrainedForeignId('program_id');
        });

        Schema::table('courses', function (Blueprint $table): void {
            $table->dropIndex(['program_id']);
            $table->dropConstrainedForeignId('program_id');
        });

        Schema::table('teachers', fn (Blueprint $table) => $table->dropColumn('qualifications'));
        Schema::dropIfExists('floors');
        Schema::dropIfExists('buildings');
        Schema::dropIfExists('programs');
    }

    private function backfillLegacyClassrooms(): void
    {
        $classrooms = DB::table('classrooms')->orderBy('id')->get(['id', 'building', 'floor']);
        $buildingIds = [];
        $floorIds = [];

        foreach ($classrooms as $classroom) {
            $buildingName = trim((string) ($classroom->building ?? ''));
            if ($buildingName === '') {
                continue;
            }

            $buildingId = $buildingIds[$buildingName] ?? DB::table('buildings')->where('name', $buildingName)->value('id');
            if (! $buildingId) {
                $baseCode = Str::upper(Str::limit(Str::slug($buildingName, '-'), 25, '')) ?: 'BUILDING';
                $code = $baseCode;
                $suffix = 2;
                while (DB::table('buildings')->where('code', $code)->exists()) {
                    $code = Str::limit($baseCode, 25, '').'-'.$suffix++;
                }
                $buildingId = DB::table('buildings')->insertGetId([
                    'code' => $code,
                    'name' => $buildingName,
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $buildingIds[$buildingName] = $buildingId;

            $floorName = trim((string) ($classroom->floor ?? ''));
            if ($floorName === '') {
                continue;
            }

            $floorKey = $buildingId.'|'.$floorName;
            $floorId = $floorIds[$floorKey] ?? DB::table('floors')
                ->where('building_id', $buildingId)
                ->where('name', $floorName)
                ->value('id');
            if (! $floorId) {
                $floorNumber = preg_match('/^-?\d+$/', $floorName) === 1 ? (int) $floorName : null;
                $floorId = DB::table('floors')->insertGetId([
                    'building_id' => $buildingId,
                    'floor_number' => $floorNumber,
                    'name' => $floorName,
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $floorIds[$floorKey] = $floorId;

            DB::table('classrooms')->where('id', $classroom->id)->update([
                'floor_id' => $floorId,
                'capacity' => 35,
            ]);
        }
    }

    private function backfillClassCodes(): void
    {
        $sections = DB::table('class_sections')
            ->join('courses', 'courses.id', '=', 'class_sections.course_id')
            ->join('semesters', 'semesters.id', '=', 'class_sections.semester_id')
            ->join('academic_years', 'academic_years.id', '=', 'semesters.academic_year_id')
            ->orderBy('class_sections.id')
            ->get([
                'class_sections.id', 'class_sections.section_code', 'courses.course_code',
                'semesters.name as semester_name', 'academic_years.name as academic_year_name',
            ]);

        foreach ($sections as $section) {
            $parts = [
                $section->course_code,
                $section->academic_year_name,
                $section->semester_name,
                $section->section_code,
            ];
            $baseCode = Str::upper(Str::limit(Str::slug(implode('-', $parts), '-'), 110, '')) ?: 'CLASS-'.$section->id;
            $code = $baseCode;
            $suffix = 2;
            while (DB::table('class_sections')->where('class_code', $code)->exists()) {
                $code = Str::limit($baseCode, 110, '').'-'.$suffix++;
            }
            DB::table('class_sections')->where('id', $section->id)->update(['class_code' => $code]);
        }
    }
};
