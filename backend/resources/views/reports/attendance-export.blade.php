<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Smart Attendance Report</title>
    <style>
        @font-face {
            font-family: 'Noto Serif Khmer';
            font-style: normal;
            font-weight: normal;
            src: url('file://{{ resource_path('fonts/NotoSerifKhmer-Medium.ttf') }}') format('truetype');
        }
        @page { margin: 28px; }
        body { font-family: 'Noto Serif Khmer', DejaVu Sans, sans-serif; font-size: 9px; color: #172033; }
        h1 { color: #1d4ed8; font-size: 18px; margin: 0 0 5px; }
        p { color: #64748b; margin: 0 0 14px; }
        table { border-collapse: collapse; width: 100%; }
        th { background: #eff6ff; color: #1e3a8a; text-align: left; }
        th, td { border: 1px solid #dbe4f0; padding: 6px; vertical-align: top; }
        tr:nth-child(even) td { background: #f8fafc; }
    </style>
</head>
<body>
    <h1>Smart Attendance</h1>
    <p>Attendance report · Generated {{ $generatedAt }} · Asia/Phnom_Penh</p>
    <p>
        Opportunities: {{ $summary['opportunities'] }} · Present: {{ $summary['present'] }} · Late: {{ $summary['late'] }} ·
        Absent: {{ $summary['absent'] }} · Permission: {{ $summary['excused'] }} · Unrecorded: {{ $summary['unrecorded'] }} ·
        Attendance rate: {{ $summary['attendance_rate'] === null ? 'N/A' : $summary['attendance_rate'].'%' }}
    </p>
    <table>
        <thead><tr>
            <th>Date</th><th>Student ID</th><th>Student Code</th><th>Student Name</th>
            <th>Course</th><th>Section</th><th>Status</th><th>Check-in</th><th>Method</th><th>Remarks</th>
        </tr></thead>
        <tbody>
        @forelse ($rows as $row)
            <tr>
                <td>{{ $row['date'] }}</td><td>{{ $row['student_id'] }}</td><td>{{ $row['student_code'] }}</td>
                <td>{{ $row['student_name'] }}</td><td>{{ $row['course_code'] }} · {{ $row['course_name'] }}</td>
                <td>{{ $row['section'] }}</td><td>{{ ucfirst($row['status']) }}</td><td>{{ $row['check_in_time'] ?? '—' }}</td>
                <td>{{ $row['method'] ?? '—' }}</td><td>{{ $row['remarks'] ?? '' }}</td>
            </tr>
        @empty
            <tr><td colspan="10">No finalized attendance opportunities match the selected filters.</td></tr>
        @endforelse
        </tbody>
    </table>
</body>
</html>
