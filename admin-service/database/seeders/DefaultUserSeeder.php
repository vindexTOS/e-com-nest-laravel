<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Log;

class DefaultUserSeeder extends Seeder
{
    public function run(): void
    {
        $userEmail = 'user@gmail.com';
        $userPassword = '1234567';

        $existingUser = User::where('email', $userEmail)->first();

        if ($existingUser) {
            Log::info("Default user already exists: {$userEmail}");
            return;
        }

        $user = new User();
        $user->email = $userEmail;
        $user->password = $userPassword; // The 'hashed' cast will automatically hash this
        $user->first_name = 'Default';
        $user->last_name = 'User';
        $user->role = 'customer';
        $user->is_active = true;
        $user->email_verified_at = now();
        $user->balance = 0;
        $user->save();

        Log::info("✅ Default user created successfully: {$userEmail}");
        Log::warning("⚠️  Default password: {$userPassword} - Please change in production!");
    }
}

