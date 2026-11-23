<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GradePolicy extends Model
{
    protected $fillable = [
        'semester_id', 'attendance_points', 'activities_points', 'midterm_points', 'final_points',
        'pass_threshold', 'late_credit', 'permission_credit', 'absent_credit',
        'missing_attendance_policy', 'require_all_subjects_pass', 'max_subject_offerings', 'weekly_contact_hours',
    ];

    protected function casts(): array
    {
        return ['require_all_subjects_pass' => 'boolean', 'pass_threshold' => 'decimal:2', 'late_credit' => 'decimal:3', 'permission_credit' => 'decimal:3', 'absent_credit' => 'decimal:3', 'weekly_contact_hours' => 'decimal:2'];
    }

    public function semester(): BelongsTo { return $this->belongsTo(Semester::class); }
}
