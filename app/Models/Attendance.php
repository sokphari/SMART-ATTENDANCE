<?php

namespace App\Models;

use App\Enums\AttendanceStatus;
use App\Enums\VerificationMethod;
use Database\Factories\AttendanceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Attendance extends Model
{
    /** @use HasFactory<AttendanceFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'attendance_session_id',
        'student_id',
        'status',
        'verification_method',
        'latitude',
        'longitude',
        'gps_accuracy_meters',
        'distance_meters',
        'checked_in_at',
        'marked_by',
        'remarks',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => AttendanceStatus::class,
            'verification_method' => VerificationMethod::class,
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'gps_accuracy_meters' => 'decimal:2',
            'distance_meters' => 'decimal:2',
            'checked_in_at' => 'datetime',
        ];
    }

    public function attendanceSession(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function markedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'marked_by');
    }

    public function corrections(): HasMany
    {
        return $this->hasMany(AttendanceCorrection::class);
    }
}
