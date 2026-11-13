<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StudentSeeder extends Seeder
{
    /**
     * Seed 10 students spread across departments with linked user accounts.
     */
    public function run(): void
    {
        $students = [
            ['name' => 'Sokha Meas',       'email' => 'sokha.meas@student.edu',      'code' => 'STU-0001', 'dept' => 'CS',   'year' => 1, 'gender' => 'male',   'phone' => '+855-12-200-001'],
            ['name' => 'Dina Chea',        'email' => 'dina.chea@student.edu',       'code' => 'STU-0002', 'dept' => 'IT',   'year' => 2, 'gender' => 'female', 'phone' => '+855-12-200-002'],
            ['name' => 'Vuthy Phan',       'email' => 'vuthy.phan@student.edu',      'code' => 'STU-0003', 'dept' => 'SE',   'year' => 1, 'gender' => 'male',   'phone' => '+855-12-200-003'],
            ['name' => 'Sreymom Keo',      'email' => 'sreymom.keo@student.edu',     'code' => 'STU-0004', 'dept' => 'EE',   'year' => 3, 'gender' => 'female', 'phone' => '+855-12-200-004'],
            ['name' => 'Piseth Lim',       'email' => 'piseth.lim@student.edu',      'code' => 'STU-0005', 'dept' => 'BA',   'year' => 2, 'gender' => 'male',   'phone' => '+855-12-200-005'],
            ['name' => 'Chanpisa Noun',    'email' => 'chanpisa.noun@student.edu',   'code' => 'STU-0006', 'dept' => 'AF',   'year' => 4, 'gender' => 'female', 'phone' => '+855-12-200-006'],
            ['name' => 'Rith Sorn',        'email' => 'rith.sorn@student.edu',       'code' => 'STU-0007', 'dept' => 'CE',   'year' => 1, 'gender' => 'male',   'phone' => '+855-12-200-007'],
            ['name' => 'Sopheap Teng',     'email' => 'sopheap.teng@student.edu',    'code' => 'STU-0008', 'dept' => 'ME',   'year' => 3, 'gender' => 'male',   'phone' => '+855-12-200-008'],
            ['name' => 'Borei Khun',       'email' => 'borei.khun@student.edu',      'code' => 'STU-0009', 'dept' => 'EL',   'year' => 2, 'gender' => 'female', 'phone' => '+855-12-200-009'],
            ['name' => 'Kimlong Sar',      'email' => 'kimlong.sar@student.edu',     'code' => 'STU-0010', 'dept' => 'MATH', 'year' => 4, 'gender' => 'male',   'phone' => '+855-12-200-010'],
        ];

        $departments = Department::pluck('id', 'code');

        foreach ($students as $data) {
            DB::transaction(function () use ($data, $departments): void {
                $user = User::updateOrCreate(
                    ['email' => $data['email']],
                    [
                        'name'     => $data['name'],
                        'password' => 'password',
                        'role'     => UserRole::Student,
                        'status'   => AccountStatus::Active,
                    ],
                );

                Student::updateOrCreate(
                    ['student_code' => $data['code']],
                    [
                        'user_id'       => $user->id,
                        'department_id' => $departments[$data['dept']],
                        'year_level'    => $data['year'],
                        'gender'        => $data['gender'],
                        'phone'         => $data['phone'],
                    ],
                );
            });
        }

        $this->command?->info('Seeded ' . count($students) . ' students.');
    }
}

