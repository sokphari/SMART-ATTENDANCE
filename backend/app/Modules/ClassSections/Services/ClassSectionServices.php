<?php

namespace App\Modules\ClassSections\Services;

use App\Enums\ClassSectionStatus;
use App\Models\ClassSection;
use App\Models\ClassSchedule;
use App\Models\TeacherAssignment;
use App\Models\Course;
use App\Models\Program;
use App\Models\Teacher;
use App\Modules\ClassSchedules\Services\ScheduleConflictService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClassSectionServices
{
    public function __construct(private readonly ScheduleConflictService $conflicts) {}
    /**
     * @param  array{search?: string|null, course_id?: int|string|null, semester_id?: int|string|null, status?: string|null, per_page?: int|string|null}  $filters
     */
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        return ClassSection::query()
            ->with([
                'course.department',
                'semester.academicYear',
                'teacherAssignments.teacher.user',
                'classSchedules.classroom',
                'classSchedules.timeSlot.studyPeriod',
            ])
            ->withCount(['enrollments as enrolled_count' => fn ($query) => $query->where('status', 'enrolled')])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $term = '%'.strtolower($search).'%';

                $query->where(function ($query) use ($term): void {
                    $query->whereRaw('LOWER(section_code) LIKE ?', [$term])
                        ->orWhereHas('course', function ($query) use ($term): void {
                            $query->whereRaw('LOWER(course_code) LIKE ?', [$term])
                                ->orWhereRaw('LOWER(name) LIKE ?', [$term]);
                        });
                });
            })
            ->when(
                $filters['course_id'] ?? null,
                fn ($query, $courseId) => $query->where('course_id', $courseId)
            )
            ->when(
                $filters['department_id'] ?? null,
                fn ($query, $deptId) => $query->whereHas('course', fn ($q) => $q->where('department_id', $deptId))
            )
            ->when(
                $filters['semester_id'] ?? null,
                fn ($query, $semesterId) => $query->where('semester_id', $semesterId)
            )
            ->when(
                $filters['status'] ?? null,
                fn ($query, string $status) => $query->where('status', $status)
            )
            ->orderBy('id')
            ->paginate((int) ($filters['per_page'] ?? 15))
            ->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): ClassSection
    {
        return DB::transaction(function () use ($data): ClassSection {
            $course = Course::query()->with('department')->lockForUpdate()->findOrFail($data['course_id']);
            $semester = \App\Models\Semester::query()->with('academicYear')->lockForUpdate()->findOrFail($data['semester_id']);
            if (! $course->isActive() || ! $course->department?->isActive()) {
                throw ValidationException::withMessages(['course_id' => ['Select a course in an active department.']]);
            }
            $validPeriodStatuses = [\App\Enums\AcademicPeriodStatus::Active, \App\Enums\AcademicPeriodStatus::Upcoming];
            if (! in_array($semester->status, $validPeriodStatuses, true) || ! in_array($semester->academicYear?->status, $validPeriodStatuses, true)) {
                throw ValidationException::withMessages(['semester_id' => ['Select an active or upcoming semester and academic year.']]);
            }
            if (isset($data['program_id'])) {
                $program = Program::query()->lockForUpdate()->findOrFail($data['program_id']);
                if ($program->department_id !== $course->department_id || $program->status !== 'active') {
                    throw ValidationException::withMessages(['program_id' => ['Select an active program from the course department.']]);
                }
            }
            if ($course->program_id && isset($data['program_id']) && (int) $course->program_id !== (int) $data['program_id']) {
                throw ValidationException::withMessages(['program_id' => ['The selected program does not match the course program.']]);
            }
            $programId = $data['program_id'] ?? $course->program_id;

            $classStart = $data['class_start_date'] ?? $semester->start_date->toDateString();
            $classEnd = $data['class_end_date'] ?? $semester->end_date->toDateString();
            if ($classStart < $semester->start_date->toDateString() || $classEnd > $semester->end_date->toDateString()) {
                throw ValidationException::withMessages(['class_start_date' => ['Class dates must fall within the selected semester.']]);
            }

            $classCode = $data['class_code'] ?? $this->generateClassCode($course->course_code, $semester, $data['section_code']);
            $classSection = ClassSection::create([
                'course_id' => $course->id,
                'semester_id' => $semester->id,
                'section_code' => $data['section_code'],
                'class_code' => $classCode,
                'program_id' => $programId,
                'capacity' => $data['capacity'],
                'program_id' => $data['program_id'] ?? null,
                'year_level' => $data['year_level'] ?? null,
                'class_start_date' => $classStart,
                'class_end_date' => $classEnd,
                'status' => $data['status'] ?? ClassSectionStatus::Active->value,
            ]);

            if (! empty($data['teacher_id'])) {
                $teacher = Teacher::query()->with('user')->lockForUpdate()->findOrFail($data['teacher_id']);
                if ($teacher->department_id !== $course->department_id || $teacher->user?->status?->value !== 'active') {
                    throw ValidationException::withMessages(['teacher_id' => ['Select an active teacher from the course department.']]);
                }
                TeacherAssignment::create(['class_section_id' => $classSection->id, 'teacher_id' => $teacher->id, 'assigned_at' => now()]);
            }

            foreach ($data['schedules'] ?? [] as $schedule) {
                $row = [
                    'class_section_id' => $classSection->id,
                    'classroom_id' => (int) $schedule['classroom_id'],
                    'day_of_week' => (int) $schedule['day_of_week'],
                    'start_time' => $schedule['start_time'],
                    'end_time' => $schedule['end_time'],
                    'effective_from' => $schedule['effective_from'] ?? $classStart,
                    'effective_until' => $schedule['effective_until'] ?? $classEnd,
                    'status' => 'active',
                ];
                $this->conflicts->assertValid($row);
                ClassSchedule::create($row);
            }

            return $classSection->load(['course.department', 'semester.academicYear', 'teacherAssignments.teacher.user', 'classSchedules.classroom.floorRecord.building']);
        }, 3);
    }

    private function generateClassCode(string $courseCode, \App\Models\Semester $semester, string $section): string
    {
        $prefix = strtoupper(preg_replace('/[^A-Z0-9]+/i', '-', $courseCode) ?? 'CLASS');
        $year = preg_replace('/[^A-Z0-9]+/i', '-', (string) $semester->academicYear?->name);
        $term = preg_replace('/[^A-Z0-9]+/i', '-', (string) $semester->name);
        $candidate = trim($prefix.'-'.$year.'-'.$term.'-'.$section, '-');
        return substr($candidate, 0, 100);
    }

    public function eligibleStudents(ClassSection $section, array $filters = [])
    {
        return \App\Models\Student::query()->with('user:id,name,email')->where('department_id', $section->course->department_id)
            ->when($section->program_id, fn ($query) => $query->where('program_id', $section->program_id))
            ->when($section->year_level, fn ($query) => $query->where('year_level', $section->year_level))
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $term = '%'.strtolower($search).'%';
                $query->where(fn ($q) => $q->whereRaw('LOWER(student_code) LIKE ?', [$term])->orWhereHas('user', fn ($u) => $u->whereRaw('LOWER(name) LIKE ?', [$term])->orWhereRaw('LOWER(email) LIKE ?', [$term])));
            })
            ->whereDoesntHave('enrollments', fn ($query) => $query->where('class_section_id', $section->id)->where('status', 'enrolled'))
            ->orderBy('student_code')->paginate((int) ($filters['per_page'] ?? 15))->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ClassSection $classSection, array $data): ClassSection
    {
        $nextStatus = $data['status'] ?? null;
        if ($classSection->status === ClassSectionStatus::PendingSetup
            && $nextStatus === ClassSectionStatus::Active->value) {
            $missing = [];
            if (! $classSection->teacherAssignments()->exists()) $missing[] = 'Assign a teacher';
            if (! $classSection->classSchedules()->exists()) $missing[] = 'Add a class schedule';

            if ($missing !== []) {
                throw ValidationException::withMessages([
                    'status' => [implode(' and ', $missing).' before activating this section.'],
                ]);
            }
        }

        $classSection->fill($data);
        $classSection->save();

        return $classSection->refresh()->load(['course.department', 'semester.academicYear']);
    }

    public function deactivate(ClassSection $classSection): void
    {
        $classSection->update(['status' => ClassSectionStatus::Inactive->value]);
    }
}
