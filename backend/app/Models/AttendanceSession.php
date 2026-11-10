<?php

namespace App\Models;

use App\Enums\AttendanceSessionStatus;
use Database\Factories\AttendanceSessionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceSession extends Model
{
    /** @use HasFactory<AttendanceSessionFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'class_section_id',
        'class_schedule_id',
        'teacher_id',
        'classroom_id',
        'session_date',
        'starts_at',
        'late_after',
        'closes_at',
        'closed_at',
        'status',
        'allowed_latitude',
        'allowed_longitude',
        'allowed_radius_meters',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'session_date' => 'date',
            'starts_at' => 'datetime',
            'late_after' => 'datetime',
            'closes_at' => 'datetime',
            'closed_at' => 'datetime',
            'status' => AttendanceSessionStatus::class,
            'allowed_latitude' => 'decimal:7',
            'allowed_longitude' => 'decimal:7',
            'allowed_radius_meters' => 'integer',
        ];
    }

    public function classSection(): BelongsTo
    {
        return $this->belongsTo(ClassSection::class);
    }

    public function classSchedule(): BelongsTo
    {
        return $this->belongsTo(ClassSchedule::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function qrTokens(): HasMany
    {
        return $this->hasMany(AttendanceQrToken::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function isOpen(): bool
    {
        return $this->status === AttendanceSessionStatus::Open;
    }
}
