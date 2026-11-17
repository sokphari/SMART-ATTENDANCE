<?php

namespace App\Enums;

enum ClassSectionStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
    case PendingSetup = 'pending_setup';
}
