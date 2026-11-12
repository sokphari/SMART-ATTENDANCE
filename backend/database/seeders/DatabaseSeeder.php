<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,    // 1. admin user (no deps)
            DepartmentSeeder::class,   // 2. departments (no deps)
            AcademicYearSeeder::class, // 3. academic years (no deps)
            CourseSeeder::class,       // 4. courses (needs: departments)
            TeacherSeeder::class,      // 5. teachers + users (needs: departments)
            StudentSeeder::class,      // 6. students + users (needs: departments)
        ]);
    }
}
