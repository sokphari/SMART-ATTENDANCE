<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TimetableSetting extends Model
{
    protected $table = 'timetable_settings';

    protected $fillable = [
        'max_weekly_teaching_hours',
        'max_assigned_sections',
        'timezone',
        'automatic_attendance_enabled',
        'late_after_minutes',
        'check_in_window_minutes',
        'geofencing_enabled',
        'gps_accuracy_threshold_meters',
    ];

    protected function casts(): array
    {
        return [
            'max_weekly_teaching_hours' => 'decimal:2',
            'max_assigned_sections' => 'integer',
            'automatic_attendance_enabled' => 'boolean',
            'late_after_minutes' => 'integer',
            'check_in_window_minutes' => 'integer',
            'geofencing_enabled' => 'boolean',
            'gps_accuracy_threshold_meters' => 'integer',
        ];
    }
}
