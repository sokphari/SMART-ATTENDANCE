<?php

namespace Database\Seeders;

use App\Enums\ClassScheduleStatus;
use App\Enums\ClassSectionStatus;
use App\Models\Classroom;
use App\Models\ClassSchedule;
use App\Models\ClassSection;
use App\Models\Course;
use App\Models\ScheduleTimeSlot;
use App\Models\Semester;
use Illuminate\Database\Seeder;

class ScheduleSeeder extends Seeder
{
    /** Seed repeatable, conflict-free fake timetable rows using configured teaching slots. */
    public function run(): void
    {
        $semester = Semester::query()->where('status', 'active')->orderBy('start_date')->first()
            ?? Semester::query()->where('status', 'upcoming')->orderBy('start_date')->first();
        if (! $semester) {
            $this->command?->error('No active or upcoming semester is available for demo schedules.');
            return;
        }

        $courseCodes = ['CS-101', 'IT-101', 'SE-101', 'EE-101', 'BA-101', 'AF-101', 'CE-101', 'ME-101', 'EL-101', 'MATH-101'];
        $courses = Course::query()->whereIn('course_code', $courseCodes)->get()->keyBy('course_code');
        $sections = ClassSection::query()->where('semester_id', $semester->id)->where('section_code', 'A')->get()->keyBy('course_id');
        $rooms = Classroom::query()->where('status', 'active')->get()->keyBy('room_code');
        $slots = ScheduleTimeSlot::query()->where('is_active', true)->where('is_break', false)->get()->keyBy('code');

        $definitions = [
            ['course' => 'CS-101', 'room' => 'B101', 'day' => 1, 'slot' => 'morning-1'],
            ['course' => 'IT-101', 'room' => 'B102', 'day' => 1, 'slot' => 'morning-1'],
            ['course' => 'SE-101', 'room' => 'B201', 'day' => 2, 'slot' => 'morning-1'],
            ['course' => 'EE-101', 'room' => 'D101', 'day' => 2, 'slot' => 'afternoon-1'],
            ['course' => 'BA-101', 'room' => 'B202', 'day' => 3, 'slot' => 'morning-2'],
            ['course' => 'AF-101', 'room' => 'C101', 'day' => 3, 'slot' => 'afternoon-2'],
            ['course' => 'CE-101', 'room' => 'D102', 'day' => 4, 'slot' => 'morning-1'],
            ['course' => 'ME-101', 'room' => 'D102', 'day' => 4, 'slot' => 'afternoon-1'],
            ['course' => 'EL-101', 'room' => 'E101', 'day' => 5, 'slot' => 'morning-2'],
            ['course' => 'MATH-101', 'room' => 'C201', 'day' => 5, 'slot' => 'evening-1'],
        ];

        $count = 0;
        foreach ($definitions as $definition) {
            $course = $courses->get($definition['course']);
            $section = $course ? $sections->get($course->id) : null;
            $room = $rooms->get($definition['room']);
            $slot = $slots->get($definition['slot']);
            if (! $section || ! $room || ! $slot) {
                $this->command?->warn("Skipped timetable demo row for {$definition['course']}; a section, room, or configured slot is missing.");
                continue;
            }

            ClassSchedule::updateOrCreate(
                [
                    'class_section_id' => $section->id,
                    'day_of_week' => $definition['day'],
                    'time_slot_id' => $slot->id,
                ],
                [
                    'classroom_id' => $room->id,
                    'start_time' => $slot->starts_at,
                    'end_time' => $slot->ends_at,
                    'effective_from' => null,
                    'effective_until' => null,
                    'status' => ClassScheduleStatus::Active,
                ],
            );
            $count++;
        }

        $activated = ClassSection::query()
            ->where('semester_id', $semester->id)
            ->where('status', ClassSectionStatus::PendingSetup->value)
            ->whereHas('teacherAssignments')
            ->whereHas('classSchedules', fn ($query) => $query->where('status', ClassScheduleStatus::Active->value))
            ->update(['status' => ClassSectionStatus::Active->value]);

        $this->command?->info("Seeded {$count} configured demo timetable entries and activated {$activated} fully configured sections for {$semester->name}.");
    }
}
