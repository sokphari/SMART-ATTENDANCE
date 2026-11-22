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
            BuildingFloorSeeder::class,      // 6. Five buildings with related floors
            ClassroomSeeder::class,          // 7. Classrooms linked to campus floors
            CourseSeeder::class,             // 8. 10 Courses (1 per department)
            TeacherSeeder::class,            // 9. 10 Teachers + User accounts
            StudentSeeder::class,            // 10. 10 Students + User accounts
            ProgramSeeder::class,            // 11. Programs connected to departments, courses, and students
            ClassSectionSeeder::class,       // 12. Demo sections start in pending setup
            TeacherAssignmentSeeder::class,  // 13. Assign demo teachers
            ScheduleSeeder::class,           // 14. Configure slots, then activate ready sections
            EnrollmentSeeder::class,         // 15. Enroll demo students in active sections
            AttendanceTrackingDemoSeeder::class, // 16. Ready one class for attendance tracking
            AttendanceHistoryDemoSeeder::class, // 17. Seed linked attendance history and correction examples
        ]);
    }
}
