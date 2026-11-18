<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScheduleTimeSlot extends Model
{
    protected $fillable = ['study_period_id', 'code', 'name', 'starts_at', 'ends_at', 'is_break', 'position', 'is_active'];

    protected function casts(): array
    {
        return ['is_break' => 'boolean', 'is_active' => 'boolean', 'position' => 'integer'];
    }

    public function studyPeriod(): BelongsTo
    {
        return $this->belongsTo(StudyPeriod::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(ClassSchedule::class, 'time_slot_id');
    }
}
