<?php

namespace App\Models;

use App\Enums\ClassroomStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Floor extends Model
{
    protected $fillable = ['building_id', 'floor_number', 'name', 'status'];

    protected function casts(): array
    {
        return ['floor_number' => 'integer'];
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    public function classrooms(): HasMany
    {
        return $this->hasMany(Classroom::class);
    }

    public function isActive(): bool
    {
        return $this->status === ClassroomStatus::Active->value;
    }
}
