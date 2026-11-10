<?php

namespace Database\Seeders;

use App\Enums\DepartmentStatus;
use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Seed a fixed set of departments for local testing.
     */
    public function run(): void
    {
        $departments = [
            ['name' => 'Computer Science', 'code' => 'CS', 'description' => 'Software, algorithms and computing fundamentals.'],
            ['name' => 'Information Technology', 'code' => 'IT', 'description' => 'Networking, systems and IT infrastructure.'],
            ['name' => 'Software Engineering', 'code' => 'SE', 'description' => 'Software design, architecture and delivery.'],
            ['name' => 'Electrical Engineering', 'code' => 'EE', 'description' => 'Electrical systems and electronics.'],
            ['name' => 'Business Administration', 'code' => 'BA', 'description' => 'Management, marketing and operations.'],
            ['name' => 'Accounting and Finance', 'code' => 'AF', 'description' => 'Accounting, auditing and financial management.'],
            ['name' => 'Civil Engineering', 'code' => 'CE', 'description' => 'Structures, construction and infrastructure.'],
            ['name' => 'Mechanical Engineering', 'code' => 'ME', 'description' => 'Machines, thermodynamics and manufacturing.'],
            ['name' => 'English Language', 'code' => 'EL', 'description' => 'English language and communication studies.'],
            ['name' => 'Mathematics', 'code' => 'MATH', 'description' => 'Pure and applied mathematics.'],
        ];

        foreach ($departments as $department) {
            Department::updateOrCreate(
                ['code' => $department['code']],
                [
                    'name' => $department['name'],
                    'description' => $department['description'],
                    'status' => DepartmentStatus::Active->value,
                ],
            );
        }

        $this->command?->info('Seeded '.count($departments).' departments.');
    }
}
