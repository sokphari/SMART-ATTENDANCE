<?php

namespace Database\Factories;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditLog>
 */
class AuditLogFactory extends Factory
{
    protected $model = AuditLog::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'action' => 'test.action',
            'entity_type' => 'test_entity',
            'entity_id' => fake()->numberBetween(1, 1000),
            'old_values' => null,
            'new_values' => null,
            'ip_address' => fake()->ipv4(),
            'created_at' => now(),
        ];
    }
}
