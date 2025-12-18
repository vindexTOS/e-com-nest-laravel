<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $adminEmail = 'admin@gmail.com';
        $adminPassword = '1234567';

        $existingAdmin = User::where('email', $adminEmail)->first();

        if ($existingAdmin) {
            Log::info("Admin user already exists: {$adminEmail}");
            return;
        }

        User::create([
            'email' => $adminEmail,
            'password' => Hash::make($adminPassword),
            'first_name' => 'Admin',
            'last_name' => 'User',
            'role' => 'admin',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        Log::info("✅ Admin user created successfully: {$adminEmail}");
        Log::warning("⚠️  Default password: {$adminPassword} - Please change in production!");
    }
}

