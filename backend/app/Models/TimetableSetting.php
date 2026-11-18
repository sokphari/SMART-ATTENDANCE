<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TimetableSetting extends Model
{
    protected $table = 'timetable_settings';

    protected $fillable = ['max_weekly_teaching_hours', 'max_assigned_sections', 'timezone'];

    protected function casts(): array
    {
        return ['max_weekly_teaching_hours' => 'decimal:2', 'max_assigned_sections' => 'integer'];
    }
}
