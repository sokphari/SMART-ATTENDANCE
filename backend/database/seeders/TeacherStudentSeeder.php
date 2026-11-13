<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

class TeacherStudentSeeder extends Seeder
{
    public function run(): void
    {
        // Teacher account
        User::updateOrCreate(
            ['email' => 'teacher@example.com'],
            [
                'name' => 'Test Teacher',
                'password' => 'password123',
                'role' => UserRole::Teacher,
                'status' => AccountStatus::Active,
            ],
        );

        // Student account
        User::updateOrCreate(
            ['email' => 'student@example.com'],
            [
                'name' => 'Test Student',
                'password' => 'password123',
                'role' => UserRole::Student,
                'status' => AccountStatus::Active,
            ],
        );

        $this->command?->info('Teacher and Student accounts ensured.');
    }
}
