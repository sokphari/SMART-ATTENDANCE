<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentRegistrationToken extends Model
{
    protected $fillable = [
        'created_by',
        'token_hash',
        'expires_at',
        'used_at',
        'revoked_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'immutable_datetime',
            'used_at' => 'immutable_datetime',
            'revoked_at' => 'immutable_datetime',
        ];
    }
}
