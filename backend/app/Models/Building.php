<?php

namespace App\Models;

use App\Enums\ClassroomStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Building extends Model
{
    protected $fillable = ['code', 'name', 'description', 'status'];

    public function floors(): HasMany
    {
        return $this->hasMany(Floor::class)->orderBy('floor_number')->orderBy('name');
    }

    public function classrooms(): HasManyThrough
    {
        return $this->hasManyThrough(Classroom::class, Floor::class);
    }

    public function isActive(): bool
    {
        return $this->status === ClassroomStatus::Active->value;
    }
}
