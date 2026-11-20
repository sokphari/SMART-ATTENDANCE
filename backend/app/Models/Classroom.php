<?php

namespace App\Models;

use App\Enums\ClassroomStatus;
use Database\Factories\ClassroomFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Classroom extends Model
{
    /** @use HasFactory<ClassroomFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'room_code',
        'floor_id',
        'capacity',
        'room_type',
        'building',
        'floor',
        'latitude',
        'longitude',
        'allowed_radius_meters',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'allowed_radius_meters' => 'integer',
            'capacity' => 'integer',
            'status' => ClassroomStatus::class,
        ];
    }

    public function isActive(): bool
    {
        return $this->status === ClassroomStatus::Active;
    }

    public function floorRecord(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Floor::class, 'floor_id');
    }
}
