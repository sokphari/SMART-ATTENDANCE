<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoleModulePermission extends Model
{
    protected $fillable = ['role', 'module', 'enabled'];

    protected function casts(): array
    {
        return ['enabled' => 'boolean'];
    }
}
