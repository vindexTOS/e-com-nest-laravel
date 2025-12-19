<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Faker\Factory as Faker;

class UserSeeder extends Seeder
{
    public function run(int $count = 10): void
    {
        $faker = Faker::create();

        for ($i = 0; $i < $count; $i++) {
            User::create([
                'email' => $faker->unique()->safeEmail(),
                'password' => Hash::make('password123'),
                'first_name' => $faker->firstName(),
                'last_name' => $faker->lastName(),
                'phone' => $faker->phoneNumber(),
                'role' => $faker->randomElement(['customer', 'admin']),
                'is_active' => $faker->boolean(90),
                'email_verified_at' => $faker->boolean(80) ? now() : null,
            ]);
        }
    }
}

