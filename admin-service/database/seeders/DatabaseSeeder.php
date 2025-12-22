<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed admin user
        $this->call(AdminSeeder::class);

        // Seed default categories
        $this->call(CategorySeeder::class);

        // Create default user
        User::firstOrCreate(
            ['email' => 'user@gmail.com'],
            [
                'email' => 'user@gmail.com',
                'password' => Hash::make('1234567'),
                'first_name' => 'Default',
                'last_name' => 'User',
                'role' => 'customer',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
    }
}
