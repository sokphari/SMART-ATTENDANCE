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
            AdminUserSeeder::class,          // 1. Admin user
            TeacherStudentSeeder::class,     // 2. Sample teacher & student user accounts
            DepartmentSeeder::class,         // 3. 10 Academic departments
            AcademicYearSeeder::class,       // 4. 10 Academic years (1 active)
            SemesterSeeder::class,           // 5. Semesters under active academic year
            ClassroomSeeder::class,          // 6. 10 Classrooms with GPS coordinates
            CourseSeeder::class,             // 7. 10 Courses (1 per department)
            TeacherSeeder::class,            // 8. 10 Teachers + User accounts
            StudentSeeder::class,            // 9. 10 Students + User accounts
            ClassSectionSeeder::class,       // 10. 10 Class sections
            TeacherAssignmentSeeder::class,  // 11. 10 Teacher assignments
            EnrollmentSeeder::class,         // 12. Student enrollments
            ScheduleSeeder::class,           // 13. 10 Weekly timetable schedules
        ]);
    }
}
