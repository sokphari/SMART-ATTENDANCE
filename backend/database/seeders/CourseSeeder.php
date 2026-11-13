<?php

namespace Database\Seeders;

use App\Enums\CourseStatus;
use App\Models\Course;
use App\Models\Department;
use Illuminate\Database\Seeder;

class CourseSeeder extends Seeder
{
    /**
     * Seed 10 courses, one per department.
     */
    public function run(): void
    {
        $courses = [
            ['dept' => 'CS',   'code' => 'CS-101',   'name' => 'Introduction to Programming',      'credits' => 3, 'description' => 'Fundamentals of programming using Python.'],
            ['dept' => 'IT',   'code' => 'IT-101',   'name' => 'Networking Fundamentals',           'credits' => 3, 'description' => 'Core concepts of computer networking and protocols.'],
            ['dept' => 'SE',   'code' => 'SE-101',   'name' => 'Software Requirements Engineering', 'credits' => 3, 'description' => 'Techniques for eliciting and documenting software requirements.'],
            ['dept' => 'EE',   'code' => 'EE-101',   'name' => 'Circuit Analysis',                  'credits' => 4, 'description' => 'Basic electrical circuit theory and analysis methods.'],
            ['dept' => 'BA',   'code' => 'BA-101',   'name' => 'Principles of Management',          'credits' => 3, 'description' => 'Introduction to organizational management and leadership.'],
            ['dept' => 'AF',   'code' => 'AF-101',   'name' => 'Financial Accounting',              'credits' => 3, 'description' => 'Fundamentals of recording and reporting financial transactions.'],
            ['dept' => 'CE',   'code' => 'CE-101',   'name' => 'Engineering Mechanics (Statics)',   'credits' => 4, 'description' => 'Forces, moments and equilibrium in structural systems.'],
            ['dept' => 'ME',   'code' => 'ME-101',   'name' => 'Engineering Thermodynamics',        'credits' => 4, 'description' => 'Laws of thermodynamics and their engineering applications.'],
            ['dept' => 'EL',   'code' => 'EL-101',   'name' => 'Academic English Writing',         'credits' => 3, 'description' => 'Essay structure, academic vocabulary and writing skills.'],
            ['dept' => 'MATH', 'code' => 'MATH-101', 'name' => 'Calculus I',                        'credits' => 4, 'description' => 'Limits, derivatives and integration of functions.'],
        ];

        $departments = Department::pluck('id', 'code');

        foreach ($courses as $course) {
            Course::updateOrCreate(
                ['course_code' => $course['code']],
                [
                    'department_id' => $departments[$course['dept']],
                    'name'          => $course['name'],
                    'description'   => $course['description'],
                    'credits'       => $course['credits'],
                    'status'        => CourseStatus::Active,
                ],
            );
        }

        $this->command?->info('Seeded ' . count($courses) . ' courses.');
    }
}

