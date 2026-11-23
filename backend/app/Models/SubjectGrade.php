<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubjectGrade extends Model
{
    protected $fillable = ['class_section_id', 'student_id', 'activities_score', 'midterm_score', 'final_score', 'attendance_score_snapshot', 'total_score_snapshot', 'result_status_snapshot', 'finalized', 'entered_by', 'finalized_at'];
    protected function casts(): array { return ['activities_score' => 'decimal:2', 'midterm_score' => 'decimal:2', 'final_score' => 'decimal:2', 'attendance_score_snapshot' => 'decimal:2', 'total_score_snapshot' => 'decimal:2', 'finalized' => 'boolean', 'finalized_at' => 'datetime']; }
    public function classSection(): BelongsTo { return $this->belongsTo(ClassSection::class); }
    public function student(): BelongsTo { return $this->belongsTo(Student::class); }
}
