<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    private static $emailCounter = 1;

    public function run(int $count = 10): void
    {
        $firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily', 'Chris', 'Lisa', 'Tom', 'Anna'];
        $lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

        for ($i = 0; $i < $count; $i++) {
            $firstName = $firstNames[array_rand($firstNames)];
            $lastName = $lastNames[array_rand($lastNames)];
            $email = 'user' . self::$emailCounter++ . '@example.com';

            User::create([
                'email' => $email,
                'password' => Hash::make('password123'),
                'first_name' => $firstName,
                'last_name' => $lastName,
                'phone' => '+1' . mt_rand(2000000000, 9999999999),
                'role' => mt_rand(1, 100) <= 10 ? 'admin' : 'customer',
                'is_active' => mt_rand(1, 100) <= 90,
                'email_verified_at' => mt_rand(1, 100) <= 80 ? now() : null,
            ]);
        }
    }
}

