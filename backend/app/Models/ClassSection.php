<?php

namespace App\Models;

use App\Enums\ClassSectionStatus;
use Database\Factories\ClassSectionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassSection extends Model
{
    /** @use HasFactory<ClassSectionFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'course_id',
        'semester_id',
        'section_code',
        'class_code',
        'program_id',
        'capacity',
        'year_level',
        'class_start_date',
        'class_end_date',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
            'year_level' => 'integer',
            'class_start_date' => 'date',
            'class_end_date' => 'date',
            'status' => ClassSectionStatus::class,
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function teacherAssignments(): HasMany
    {
        return $this->hasMany(TeacherAssignment::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function classSchedules(): HasMany
    {
        return $this->hasMany(ClassSchedule::class);
    }

    public function attendanceSessions(): HasMany
    {
        return $this->hasMany(AttendanceSession::class);
    }

    public function subjectGrades(): HasMany
    {
        return $this->hasMany(SubjectGrade::class);
    }

    public function resultPublication(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(SemesterResultPublication::class);
    }

    public function isActive(): bool
    {
        return $this->status === ClassSectionStatus::Active;
    }
}
