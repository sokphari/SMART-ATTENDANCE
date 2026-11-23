<?php

namespace App\Modules\Attendance\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Reports\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceReportController extends Controller
{
    public function __construct(private readonly ReportService $reports) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'class_section_id' => ['sometimes', 'nullable', 'integer', 'exists:class_sections,id'],
            'semester_id' => ['sometimes', 'nullable', 'integer', 'exists:semesters,id'],
            'date_from' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'date_to' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
        ]);
        $report = $this->reports->overview($filters);

        return response()->json(['data' => $this->legacyPayload($report)]);
    }

    /** Preserve the existing frontend response while using the shared report calculations. */
    private function legacyPayload(array $report): array
    {
        $summary = $report['summary'];
        $byStatus = array_intersect_key($summary, array_flip(['present', 'late', 'absent', 'excused']));
        $sections = array_map(static fn (array $row): array => [
            'class_section_id' => $row['class_section_id'],
            'section_code' => $row['section_code'],
            'course_code' => $row['course_code'],
            'total' => $row['attendance_records'],
            'opportunities' => $row['opportunities'],
            'unrecorded' => $row['unrecorded'],
            'present' => $row['present'],
            'late' => $row['late'],
            'absent' => $row['absent'],
            'excused' => $row['excused'],
            'attendance_rate' => $row['attendance_rate'],
        ], $report['by_section']);

        return [
            'total' => $summary['attendance_records'],
            'opportunities' => $summary['opportunities'],
            'unrecorded' => $summary['unrecorded'],
            'by_status' => $byStatus,
            'attendance_rate' => $summary['attendance_rate'],
            'by_section' => $sections,
            'attendance_trend' => $report['attendance_trend'],
        ];
    }
}
