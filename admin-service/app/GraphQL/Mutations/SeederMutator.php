<?php

namespace App\GraphQL\Mutations;

use Database\Seeders\ProductSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Support\Facades\Validator;

class SeederMutator
{
    public function seedProducts($_, array $args): array
    {
        $data = Validator::make($args, [
            'count' => 'nullable|integer|min:1|max:10000',
        ])->validate();

        $count = $data['count'] ?? 10;

        $seeder = new ProductSeeder();
        $seeder->run($count);

        return ['message' => "{$count} products seeded successfully."];
    }

    public function seedUsers($_, array $args): array
    {
        $data = Validator::make($args, [
            'count' => 'nullable|integer|min:1|max:10000',
        ])->validate();

        $count = $data['count'] ?? 10;

        $seeder = new UserSeeder();
        $seeder->run($count);

        return ['message' => "{$count} users seeded successfully."];
    }
}


