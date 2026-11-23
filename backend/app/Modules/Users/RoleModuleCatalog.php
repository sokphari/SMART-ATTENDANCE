<?php

namespace App\Modules\Users;

class RoleModuleCatalog
{
    /** @var array<string, string> */
    public const TEACHER_MODULES = [
        'dashboard' => 'Dashboard',
        'classes' => 'My classes',
        'attendance_sessions' => 'Attendance sessions',
        'attendance_history' => 'Attendance history',
        'attendance_reports' => 'Attendance reports',
        'grades' => 'Gradebook',
        'corrections' => 'Corrections',
        'profile' => 'My profile',
    ];
}
