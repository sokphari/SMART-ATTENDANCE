<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudyPeriod extends Model
{
    protected $fillable = ['code', 'name', 'color', 'position', 'is_active'];

    protected function casts(): array
    {
        return ['position' => 'integer', 'is_active' => 'boolean'];
    }

    public function timeSlots(): HasMany
    {
        return $this->hasMany(ScheduleTimeSlot::class)->orderBy('position');
    }
}
