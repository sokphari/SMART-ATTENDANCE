<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TeacherSeeder extends Seeder
{
    /**
     * Seed 10 teachers, one per department, with linked user accounts.
     */
    public function run(): void
    {
        $teachers = [
            ['name' => 'Dr. Sopheak Chan',    'email' => 'teacher@example.com',    'code' => 'TCH-0001', 'dept' => 'CS',   'phone' => '+855-12-100-001'],
            ['name' => 'Prof. Virak Ly',       'email' => 'virak.ly@school.edu',       'code' => 'TCH-0002', 'dept' => 'IT',   'phone' => '+855-12-100-002'],
            ['name' => 'Dr. Malis Pov',        'email' => 'malis.pov@school.edu',      'code' => 'TCH-0003', 'dept' => 'SE',   'phone' => '+855-12-100-003'],
            ['name' => 'Prof. Dara Kem',       'email' => 'dara.kem@school.edu',       'code' => 'TCH-0004', 'dept' => 'EE',   'phone' => '+855-12-100-004'],
            ['name' => 'Dr. Sreynich Heng',    'email' => 'sreynich.heng@school.edu',  'code' => 'TCH-0005', 'dept' => 'BA',   'phone' => '+855-12-100-005'],
            ['name' => 'Prof. Bopha Nget',     'email' => 'bopha.nget@school.edu',     'code' => 'TCH-0006', 'dept' => 'AF',   'phone' => '+855-12-100-006'],
            ['name' => 'Dr. Rathana Sok',      'email' => 'rathana.sok@school.edu',    'code' => 'TCH-0007', 'dept' => 'CE',   'phone' => '+855-12-100-007'],
            ['name' => 'Prof. Kimhak Oum',     'email' => 'kimhak.oum@school.edu',     'code' => 'TCH-0008', 'dept' => 'ME',   'phone' => '+855-12-100-008'],
            ['name' => 'Dr. Chanthy Ros',      'email' => 'chanthy.ros@school.edu',    'code' => 'TCH-0009', 'dept' => 'EL',   'phone' => '+855-12-100-009'],
            ['name' => 'Prof. Vanna Prum',     'email' => 'vanna.prum@school.edu',     'code' => 'TCH-0010', 'dept' => 'MATH', 'phone' => '+855-12-100-010'],
        ];

        $departments = Department::pluck('id', 'code');

        foreach ($teachers as $data) {
            DB::transaction(function () use ($data, $departments): void {
                $user = User::updateOrCreate(
                    ['email' => $data['email']],
                    [
                        'name'     => $data['name'],
                        'password' => 'password',
                        'role'     => UserRole::Teacher,
                        'status'   => AccountStatus::Active,
                    ],
                );

                Teacher::updateOrCreate(
                    ['teacher_code' => $data['code']],
                    [
                        'user_id'       => $user->id,
                        'department_id' => $departments[$data['dept']],
                        'phone'         => $data['phone'],
                    ],
                );
            });
        }

        $this->command?->info('Seeded ' . count($teachers) . ' teachers.');
    }
}

