<?php

namespace Database\Seeders;

use App\Enums\DepartmentStatus;
use App\Models\Course;
use App\Models\Department;
use App\Models\Program;
use App\Models\Student;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProgramSeeder extends Seeder
{
    /** Seed five programs and connect them to matching departments, courses, and students. */
    public function run(): void
    {
        $programs = [
            ['department' => 'CS', 'code' => 'CS-BS', 'name' => 'Computer Science'],
            ['department' => 'IT', 'code' => 'IT-BS', 'name' => 'Information Technology'],
            ['department' => 'SE', 'code' => 'SE-BS', 'name' => 'Software Engineering'],
            ['department' => 'EE', 'code' => 'EE-BS', 'name' => 'Electrical Engineering'],
            ['department' => 'BA', 'code' => 'BA-BS', 'name' => 'Business Administration'],
        ];

        $departments = Department::query()->pluck('id', 'code');
        $count = 0;

        foreach ($programs as $data) {
            $departmentId = $departments->get($data['department']);
            if (! $departmentId) {
                $this->command?->warn("Skipped program {$data['code']}: department {$data['department']} was not found.");
                continue;
            }

            DB::transaction(function () use ($data, $departmentId): void {
                $program = Program::updateOrCreate(
                    ['code' => $data['code']],
                    [
                        'department_id' => $departmentId,
                        'name' => $data['name'],
                        'description' => "Undergraduate {$data['name']} program.",
                        'status' => DepartmentStatus::Active->value,
                    ],
                );

                Course::query()->where('department_id', $departmentId)->update(['program_id' => $program->id]);
                Student::query()->where('department_id', $departmentId)->update(['program_id' => $program->id]);
            });
            $count++;
        }

        $this->command?->info("Ensured {$count} programs and linked matching course and student records.");
    }
}
