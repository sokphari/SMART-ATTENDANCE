<?php

namespace App\Enums;

enum DepartmentStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Inactive => 'Inactive',
        };
    }
}
