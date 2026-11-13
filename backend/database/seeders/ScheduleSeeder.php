<?php

namespace Database\Seeders;

use App\Models\Classroom;
use App\Models\ClassSchedule;
use App\Models\ClassSection;
use App\Models\Course;
use Illuminate\Database\Seeder;

class ScheduleSeeder extends Seeder
{
    /**
     * Seed 10 conflict-free weekly timetable schedules.
     */
    public function run(): void
    {
        $courses = Course::pluck('id', 'course_code');
        $sections = ClassSection::where('section_code', 'A')->pluck('id', 'course_id');
        $rooms = Classroom::pluck('id', 'room_code');

        $scheduleDefs = [
            ['course' => 'CS-101',   'room' => 'B101', 'day' => 1, 'start' => '08:00:00', 'end' => '10:00:00'],
            ['course' => 'IT-101',   'room' => 'B102', 'day' => 1, 'start' => '10:00:00', 'end' => '12:00:00'],
            ['course' => 'SE-101',   'room' => 'B201', 'day' => 2, 'start' => '08:00:00', 'end' => '10:00:00'],
            ['course' => 'EE-101',   'room' => 'D101', 'day' => 2, 'start' => '10:00:00', 'end' => '12:00:00'],
            ['course' => 'BA-101',   'room' => 'B202', 'day' => 3, 'start' => '08:00:00', 'end' => '10:00:00'],
            ['course' => 'AF-101',   'room' => 'C101', 'day' => 3, 'start' => '10:00:00', 'end' => '12:00:00'],
            ['course' => 'CE-101',   'room' => 'D102', 'day' => 4, 'start' => '08:00:00', 'end' => '10:00:00'],
            ['course' => 'ME-101',   'room' => 'D102', 'day' => 4, 'start' => '10:00:00', 'end' => '12:00:00'],
            ['course' => 'EL-101',   'room' => 'E101', 'day' => 5, 'start' => '08:00:00', 'end' => '10:00:00'],
            ['course' => 'MATH-101', 'room' => 'C201', 'day' => 5, 'start' => '10:00:00', 'end' => '12:00:00'],
        ];

        $count = 0;

        foreach ($scheduleDefs as $def) {
            $courseId = $courses[$def['course']] ?? null;
            $sectionId = $courseId ? ($sections[$courseId] ?? null) : null;
            $roomId = $rooms[$def['room']] ?? null;

            if (! $sectionId || ! $roomId) {
                continue;
            }

            ClassSchedule::updateOrCreate(
                [
                    'class_section_id' => $sectionId,
                    'classroom_id' => $roomId,
                    'day_of_week' => $def['day'],
                    'start_time' => $def['start'],
                    'end_time' => $def['end'],
                ],
                [
                    'effective_from' => '2025-01-01',
                    'effective_until' => '2025-06-30',
                ],
            );
            $count++;
        }

        $this->command?->info("Seeded {$count} class schedules.");
    }
}

