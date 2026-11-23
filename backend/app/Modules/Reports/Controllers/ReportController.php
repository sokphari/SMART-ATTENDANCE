<?php

namespace App\Modules\Reports\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use App\Modules\Reports\Exports\ArrayReportExport;
use App\Modules\Reports\Requests\ReportFilterRequest;
use App\Modules\Reports\Services\ReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\Response;

class ReportController extends Controller
{
    public function __construct(private readonly ReportService $reports) {}

    public function overview(ReportFilterRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->reports->overview($request->validated(), $this->teacher($request->user()))]);
    }

    public function daily(ReportFilterRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->reports->daily($request->validated(), $this->teacher($request->user()))]);
    }

    public function weekly(ReportFilterRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->reports->weekly($request->validated(), $this->teacher($request->user()))]);
    }

    public function monthly(ReportFilterRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->reports->monthly($request->validated(), $this->teacher($request->user()))]);
    }

    public function student(ReportFilterRequest $request, Student $student): JsonResponse
    {
        $teacher = $this->teacher($request->user());
        if ($teacher) {
            $this->reports->assertTeacherCanViewStudent($teacher, $student->id);
        }
        return response()->json(['data' => $this->reports->student($student->id, $request->validated(), $teacher)]);
    }

    public function classReport(ReportFilterRequest $request, int $classSection): JsonResponse
    {
        $teacher = $this->teacher($request->user());
        if ($teacher) {
            $this->reports->assertTeacherCanViewClass($teacher, $classSection);
        }
        return response()->json(['data' => $this->reports->classReport($classSection, $request->validated(), $teacher)]);
    }

    public function exportAttendance(ReportFilterRequest $request): Response
    {
        return $this->download($request->validated(), $this->teacher($request->user()), 'attendance-report');
    }

    public function exportStudent(ReportFilterRequest $request, Student $student): Response
    {
        $teacher = $this->teacher($request->user());
        if ($teacher) {
            $this->reports->assertTeacherCanViewStudent($teacher, $student->id);
        }
        return $this->download([...$request->validated(), 'student_id' => $student->id], $teacher, 'student-'.$student->student_code.'-attendance');
    }

    public function exportClass(ReportFilterRequest $request, int $classSection): Response
    {
        $teacher = $this->teacher($request->user());
        if ($teacher) {
            $this->reports->assertTeacherCanViewClass($teacher, $classSection);
        }
        return $this->download([...$request->validated(), 'class_section_id' => $classSection], $teacher, 'class-'.$classSection.'-attendance');
    }

    private function teacher(User $user): ?Teacher
    {
        $role = $user->role instanceof \BackedEnum ? $user->role->value : $user->role;
        if ($role !== 'teacher') {
            return null;
        }

        abort_unless($user->teacher, 403, 'Teacher profile is required for report access.');
        return $user->teacher;
    }

    private function download(array $filters, ?Teacher $teacher, string $filename): Response
    {
        $format = $filters['format'] ?? 'xlsx';
        unset($filters['format'], $filters['per_page'], $filters['sort_by'], $filters['sort_dir']);
        $rows = $this->reports->exportRows($filters, $teacher);
        $maximum = $format === 'pdf' ? 5000 : 50000;
        abort_if(count($rows) > $maximum, 422, "Export is limited to {$maximum} rows. Narrow the date or class filters.");
        $name = $filename.'-'.now('Asia/Phnom_Penh')->format('Ymd-His');

        if ($format === 'csv') {
            return response()->streamDownload(function () use ($rows): void {
                $stream = fopen('php://output', 'wb');
                fwrite($stream, "\xEF\xBB\xBF"); // UTF-8 BOM preserves Khmer text in Excel.
                fputcsv($stream, ['Date', 'Student ID', 'Student Code', 'Student Name', 'Course Code', 'Course Name', 'Section', 'Session ID', 'Status', 'Check-in Time', 'Method', 'Remarks']);
                foreach ($rows as $row) {
                    fputcsv($stream, array_map(fn ($value) => $this->spreadsheetSafe($value), array_values($row)));
                }
                fclose($stream);
            }, $name.'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
        }

        if ($format === 'pdf') {
            return Pdf::loadView('reports.attendance-export', [
                'rows' => $rows,
                'summary' => $this->reports->overview($filters, $teacher)['summary'],
                'generatedAt' => now('Asia/Phnom_Penh')->format('Y-m-d H:i'),
            ])->setOptions([
                'fontCache' => sys_get_temp_dir(),
                'fontDir' => sys_get_temp_dir(),
            ])->setPaper('a4', 'landscape')->download($name.'.pdf');
        }

        $safeRows = array_map(fn (array $row) => array_map(fn ($value) => $this->spreadsheetSafe($value), $row), $rows);
        return Excel::download(new ArrayReportExport($safeRows), $name.'.xlsx');
    }

    private function spreadsheetSafe(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }
        return preg_match('/^[\s\x00-\x1f]*[=+@-]/u', $value) === 1 ? "'".$value : $value;
    }
}
