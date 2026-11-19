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
            AcademicYearSeeder::class,       // 4. Date-aligned academic years for demo data
            SemesterSeeder::class,           // 5. Date-aligned semesters
            ClassroomSeeder::class,          // 6. 10 Classrooms with GPS coordinates
            CourseSeeder::class,             // 7. 10 Courses (1 per department)
            TeacherSeeder::class,            // 8. 10 Teachers + User accounts
            StudentSeeder::class,            // 9. 10 Students + User accounts
            ClassSectionSeeder::class,       // 10. Demo sections start in pending setup
            TeacherAssignmentSeeder::class,  // 11. Assign demo teachers
            ScheduleSeeder::class,           // 12. Configure slots, then activate ready sections
            EnrollmentSeeder::class,         // 13. Enroll demo students in active sections
            AttendanceTrackingDemoSeeder::class, // 14. Ready one class for attendance tracking
        ]);
    }
}
