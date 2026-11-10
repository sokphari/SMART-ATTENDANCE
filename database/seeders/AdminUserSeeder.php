<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    /**
     * Seed the initial administrator using environment-provided credentials.
     */
    public function run(): void
    {
        $email = env('ADMIN_EMAIL', 'admin@example.com');
        $password = env('ADMIN_PASSWORD', 'password');

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => env('ADMIN_NAME', 'System Administrator'),
                'password' => $password,
                'role' => UserRole::Admin,
                'status' => AccountStatus::Active,
            ],
        );

        $this->command?->info("Admin user ensured for {$email}.");
    }
}
