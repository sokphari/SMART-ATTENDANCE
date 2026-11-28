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
        $password = (string) env('ADMIN_PASSWORD', '');

        if (strlen($password) < 16 || in_array(strtolower($password), ['password', 'admin', 'changeme', 'replace-with-a-unique-random-password-at-least-16-characters'], true)) {
            $this->command?->warn('Admin account was not seeded. Set ADMIN_PASSWORD to a unique random value of at least 16 characters, then run db:seed again.');

            return;
        }

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
