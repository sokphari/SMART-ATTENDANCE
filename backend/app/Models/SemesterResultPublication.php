<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SemesterResultPublication extends Model
{
    protected $fillable = ['class_section_id', 'status', 'approved_by', 'approved_at', 'published_by', 'published_at'];
    protected function casts(): array { return ['approved_at' => 'datetime', 'published_at' => 'datetime']; }
    public function classSection(): BelongsTo { return $this->belongsTo(ClassSection::class); }
}
