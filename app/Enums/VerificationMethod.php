<?php

namespace App\Enums;

enum VerificationMethod: string
{
    case DynamicQr = 'dynamic_qr';
    case Manual = 'manual';
    case System = 'system';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
