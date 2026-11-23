<?php

namespace App\Modules\Reports\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class ArrayReportExport implements FromArray, WithHeadings
{
    /** @param list<array<string, mixed>> $rows */
    public function __construct(private readonly array $rows) {}

    public function array(): array
    {
        return array_map(static fn (array $row): array => array_values($row), $this->rows);
    }

    public function headings(): array
    {
        return ['Date', 'Student ID', 'Student Code', 'Student Name', 'Course Code', 'Course Name', 'Section', 'Session ID', 'Status', 'Check-in Time', 'Method', 'Remarks'];
    }
}
