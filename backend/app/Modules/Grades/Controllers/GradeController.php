<?php

namespace App\Modules\Grades\Controllers;

use App\Http\Controllers\Controller;
use App\Models\ClassSection;
use App\Models\AuditLog;
use App\Models\GradePolicy;
use App\Models\Semester;
use App\Models\SemesterResultPublication;
use App\Models\Student;
use App\Models\Teacher;
use App\Modules\Grades\Services\GradebookService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GradeController extends Controller
{
    public function __construct(private readonly GradebookService $grades) {}

    public function sections(Request $request): JsonResponse
    {
        $filters = $request->validate(['semester_id' => ['sometimes', 'integer', 'exists:semesters,id'], 'department_id' => ['sometimes', 'integer', 'exists:departments,id']]);
        return response()->json(['data' => $this->grades->sections($filters, $this->isTeacher($request) ? $this->teacher($request) : null)]);
    }

    public function gradebook(Request $request, ClassSection $classSection): JsonResponse
    {
        $this->authorizeSection($request, $classSection);
        $filters = $request->validate(['search' => ['sometimes', 'nullable', 'string', 'max:100'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]);
        return response()->json($this->grades->gradebook($classSection, $filters));
    }

    public function saveGrade(Request $request, ClassSection $classSection, Student $student): JsonResponse
    {
        $this->authorizeSection($request, $classSection);
        return response()->json(['data' => $this->grades->save($classSection, $student, $request->all(), $request->user(), $request->ip())]);
    }

    public function policy(Semester $semester): JsonResponse
    {
        return response()->json(['data' => $this->grades->policy($semester->id)]);
    }

    public function updatePolicy(Request $request, Semester $semester): JsonResponse
    {
        abort_if(ClassSection::query()->where('semester_id', $semester->id)->whereHas('resultPublication', fn ($q) => $q->whereIn('status', ['approved', 'published']))->exists(), 423, 'This semester has approved results, so its grading policy is locked.');
        $data = $request->validate([
            'attendance_points' => ['required', 'integer', 'min:0', 'max:100'],
            'activities_points' => ['required', 'integer', 'min:0', 'max:100'],
            'midterm_points' => ['required', 'integer', 'min:0', 'max:100'],
            'final_points' => ['required', 'integer', 'min:0', 'max:100'],
            'pass_threshold' => ['required', 'numeric', 'min:0', 'max:100'],
            'late_credit' => ['required', 'numeric', 'min:0', 'max:1'],
            'permission_credit' => ['required', 'numeric', 'min:0', 'max:1'],
            'absent_credit' => ['required', 'numeric', 'min:0', 'max:1'],
            'missing_attendance_policy' => ['required', 'in:exclude,zero'],
            'require_all_subjects_pass' => ['required', 'boolean'],
            'max_subject_offerings' => ['required', 'integer', 'min:1', 'max:30'],
            'weekly_contact_hours' => ['required', 'numeric', 'min:0.5', 'max:40'],
        ]);
        if (array_sum([$data['attendance_points'], $data['activities_points'], $data['midterm_points'], $data['final_points']]) !== 100) {
            throw ValidationException::withMessages(['points' => ['Grade component points must add up to 100.']]);
        }
        return response()->json(['data' => GradePolicy::query()->updateOrCreate(['semester_id' => $semester->id], $data)]);
    }

    public function results(Request $request): JsonResponse
    {
        $filters = $request->validate(['semester_id' => ['sometimes', 'integer', 'exists:semesters,id'], 'department_id' => ['sometimes', 'integer', 'exists:departments,id'], 'class_section_id' => ['sometimes', 'integer', 'exists:class_sections,id'], 'search' => ['sometimes', 'nullable', 'string', 'max:100']]);
        $studentId = $request->user()->student?->id;
        abort_if($request->user()->role?->value === 'student' && !$studentId, 403, 'Student profile not found.');
        $sections = $this->grades->results($filters, $request->user()->role?->value === 'student' ? $studentId : null);
        $rows = [];
        foreach ($sections as $group) foreach ($group['students'] as $subject) {
            $id = $subject['student']['id'].':'.$group['class_section']['semester_id'];
            $rows[$id] ??= ['student' => $subject['student'], 'semester_id' => $group['class_section']['semester_id'], 'semester' => $group['class_section']['semester'], 'subjects' => []];
            $rows[$id]['subjects'][] = ['class_section_id' => $group['class_section']['id'], 'course' => $group['class_section']['course'], 'course_code' => $group['class_section']['course_code'], 'section' => $group['class_section']['section'], 'department' => $group['class_section']['department'], 'publication_status' => $group['class_section']['publication_status'], 'attendance' => $subject['attendance']['score'], 'activities_score' => $subject['activities_score'], 'midterm_score' => $subject['midterm_score'], 'final_score' => $subject['final_score'], 'total' => $subject['total'], 'status' => $subject['status']];
        }
        $out = collect($rows)->map(function (array $row) use ($filters) {
            $scores = collect($row['subjects'])->pluck('total')->filter(fn ($score) => $score !== null);
            $statuses = collect($row['subjects'])->pluck('status');
            $semesterId = $filters['semester_id'] ?? null;
            $policy = $semesterId ? $this->grades->policy((int) $semesterId) : null;
            $pending = $statuses->contains('pending');
            $average = $scores->isNotEmpty() ? round((float) $scores->avg(), 2) : null;
            $hasFail = $statuses->contains('fail');
            $status = $pending ? 'pending' : (($average !== null && $average < (float) ($policy?->pass_threshold ?? 50)) || ($policy?->require_all_subjects_pass && $hasFail) ? 'fail' : 'pass');
            return [...$row, 'average' => $average, 'status' => $status];
        })->values();
        return response()->json(['data' => ['sections' => $sections, 'students' => $out]]);
    }

    public function approve(Request $request, ClassSection $classSection): JsonResponse
    {
        $this->assertComplete($classSection);
        $publication = $classSection->resultPublication()->firstOrNew();
        abort_if($publication->status === 'published', 409, 'Published results cannot be re-approved.');
        $enrollments = $classSection->enrollments()->where('status', 'enrolled')->with('student')->get();
        abort_if($enrollments->isEmpty(), 422, 'Enroll students before approving this result sheet.');
        DB::transaction(function () use ($enrollments, $classSection, $request, $publication): void {
            foreach ($enrollments as $enrollment) {
                $scores = $this->grades->studentGrade($classSection, $enrollment->student);
                \App\Models\SubjectGrade::query()->where('class_section_id', $classSection->id)->where('student_id', $enrollment->student_id)->update([
                    'attendance_score_snapshot' => $scores['attendance']['score'],
                    'total_score_snapshot' => $scores['total'],
                    'result_status_snapshot' => $scores['status'],
                    'updated_at' => now(),
                ]);
            }
            $publication->fill(['status' => 'approved', 'approved_by' => $request->user()->id, 'approved_at' => now()])->save();
        });
        AuditLog::create(['user_id' => $request->user()->id, 'action' => 'semester_results.approved', 'entity_type' => 'class_section', 'entity_id' => $classSection->id, 'old_values' => [], 'new_values' => ['status' => 'approved'], 'ip_address' => $request->ip(), 'created_at' => now()]);
        return response()->json(['data' => $publication]);
    }

    public function publish(Request $request, ClassSection $classSection): JsonResponse
    {
        $publication = $classSection->resultPublication()->firstOrFail();
        abort_unless($publication->status === 'approved', 409, 'Approve complete results before publishing.');
        $publication->fill(['status' => 'published', 'published_by' => $request->user()->id, 'published_at' => now()])->save();
        AuditLog::create(['user_id' => $request->user()->id, 'action' => 'semester_results.published', 'entity_type' => 'class_section', 'entity_id' => $classSection->id, 'old_values' => ['status' => 'approved'], 'new_values' => ['status' => 'published'], 'ip_address' => $request->ip(), 'created_at' => now()]);
        return response()->json(['data' => $publication]);
    }

    public function pdf(Request $request, ClassSection $classSection)
    {
        $fontCache = storage_path('fonts');
        if (! is_dir($fontCache)) mkdir($fontCache, 0775, true);
        $requestedStudentId = $request->validate(['student_id' => ['sometimes', 'integer', 'exists:students,id']])['student_id'] ?? null;
        $draft = $request->boolean('draft');
        if (!$draft) abort_unless($classSection->resultPublication?->status === 'published', 403, 'Only published results are available.');
        $isStudent = $request->user()->role?->value === 'student';
        if ($isStudent) {
            abort_if($draft, 403);
            $requestedStudentId = $request->user()->student?->id;
            abort_unless($requestedStudentId && $classSection->enrollments()->where('student_id', $requestedStudentId)->whereIn('status', ['enrolled', 'completed'])->exists(), 403);
        }
        if ($requestedStudentId !== null) abort_unless($classSection->enrollments()->where('student_id', $requestedStudentId)->whereIn('status', ['enrolled', 'completed'])->exists(), 404, 'Student has no result in this class section.');
        $rows = $classSection->enrollments()->whereIn('status', ['enrolled', 'completed'])->with('student.user')->get()->map(fn ($e) => $this->grades->studentGrade($classSection, $e->student));
        if ($requestedStudentId !== null) $rows = $rows->where('student.id', (int) $requestedStudentId)->values();
        $rows = $rows->map(fn ($row) => ['name' => $row['student']['name'], 'code' => $row['student']['student_code'], 'attendance' => $row['attendance']['score'], 'activities' => $row['activities_score'], 'midterm' => $row['midterm_score'], 'final' => $row['final_score'], 'total' => $row['total'], 'status' => strtoupper($row['status'])]);
        $font = base_path('resources/fonts/NotoSerifKhmer-Medium.ttf');
        $fontCss = is_file($font) ? "@font-face{font-family:Khmer;src:url('file://{$font}');} body{font-family:Khmer,DejaVu Sans,sans-serif;}" : 'body{font-family:DejaVu Sans,sans-serif;}';
        $html = '<html><head><meta charset="utf-8"><style>'.$fontCss.'body{font-size:11px;color:#172033}h1{font-size:20px}.draft{position:fixed;top:40%;left:15%;font-size:70px;color:#ddd;transform:rotate(-30deg);z-index:-1}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccd3df;padding:7px;text-align:left}th{background:#eff4fc}</style></head><body>'.($draft ? '<div class="draft">DRAFT</div>' : '').'<h1>Semester Results / លទ្ធផលឆមាស</h1><p>'.$classSection->course->course_code.' · '.$classSection->course->name.' · '.$classSection->section_code.' · '.$classSection->semester->name.'</p><table><thead><tr><th>Student / និស្សិត</th><th>Attendance</th><th>Activities</th><th>Midterm</th><th>Final</th><th>Total</th><th>Status</th></tr></thead><tbody>';
        foreach ($rows as $row) $html .= '<tr><td>'.e($row['name']).' ('.e($row['code']).')</td><td>'.e($row['attendance'] ?? '—').'</td><td>'.e($row['activities'] ?? '—').'</td><td>'.e($row['midterm'] ?? '—').'</td><td>'.e($row['final'] ?? '—').'</td><td>'.e($row['total'] ?? 'Pending').'</td><td>'.e($row['status']).'</td></tr>';
        $html .= '</tbody></table></body></html>';
        return Pdf::loadHTML($html)->setPaper('a4', 'landscape')->download('semester-results-'.$classSection->class_code.'.pdf');
    }

    private function assertComplete(ClassSection $section): void
    {
        $pending = $section->enrollments()->where('status', 'enrolled')->with('student')->get()->contains(fn ($e) => $this->grades->studentGrade($section, $e->student)['status'] === 'pending');
        if ($pending) throw ValidationException::withMessages(['grades' => ['Every enrolled student must have a finalized grade and finalized attendance before approval.']]);
    }

    private function isTeacher(Request $request): bool { return $request->user()->role?->value === 'teacher'; }
    private function teacher(Request $request): Teacher { $teacher = $request->user()->teacher; abort_if(!$teacher, 403, 'Teacher profile not found.'); return $teacher; }
    private function authorizeSection(Request $request, ClassSection $section): void
    {
        if (!$this->isTeacher($request)) return;
        abort_unless($section->teacherAssignments()->where('teacher_id', $this->teacher($request)->id)->exists(), 403, 'You are not assigned to this subject offering.');
    }
}
