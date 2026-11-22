<?php

namespace App\Modules\Attendance\Services;

final class TelegramAttendanceMessageFormatter
{
    /**
     * Format Telegram attendance notifications consistently in Khmer.
     * Keep class times (AM/PM) and calendar dates (DD/MM/YYYY) as supplied.
     */
    public function format(
        string $studentName,
        ?string $gender,
        string $status,
        string $schedule,
        string $date,
        ?int $minutesLate = null,
        bool $isTest = false,
    ): string {
        $genderLabel = match (strtolower(trim((string) $gender))) {
            'male', 'm' => 'ប្រុស',
            'female', 'f' => 'ស្រី',
            'other' => 'ផ្សេងៗ',
            default => 'មិនបានបញ្ជាក់',
        };

        $statusLabel = match (strtolower($status)) {
            'present' => 'មានវត្តមាន',
            'late' => 'យឺត ('.$this->khmerNumber(max(1, (int) $minutesLate)).' នាទី)',
            'absent' => 'អវត្តមាន',
            'excused' => 'ច្បាប់',
            default => 'មិនបានបញ្ជាក់',
        };

        $lines = [];
        if ($isTest) {
            $lines[] = '🧪 សាកល្បងប៉ុណ្ណោះ — មិនមែនជាការស្រង់វត្តមានពិតប្រាកដទេ';
            $lines[] = '';
        }

        return implode("\n", [
            ...$lines,
            '📌 ដំណឹងវត្តមានសិស្ស',
            '',
            '👤 សិស្ស៖ '.$studentName,
            '⚧ ភេទ៖ '.$genderLabel,
            '⚠️ ស្ថានភាព៖ '.$statusLabel,
            '🕒 ម៉ោងសិក្សា៖ '.$schedule,
            '📅 កាលបរិច្ឆេទ៖ '.$date,
        ]);
    }

    private function khmerNumber(int $value): string
    {
        return strtr((string) $value, [
            '0' => '០', '1' => '១', '2' => '២', '3' => '៣', '4' => '៤',
            '5' => '៥', '6' => '៦', '7' => '៧', '8' => '៨', '9' => '៩',
        ]);
    }
}
