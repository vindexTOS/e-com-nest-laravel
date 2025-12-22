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

        // Use setRawAttributes to bypass the 'hashed' cast, then save
        // Since the User model has 'password' => 'hashed' cast, we can just set the plain password
        // and Laravel will automatically hash it
        $admin = new User();
        $admin->email = $adminEmail;
        $admin->password = $adminPassword; // The 'hashed' cast will automatically hash this
        $admin->first_name = 'Admin';
        $admin->last_name = 'User';
        $admin->role = 'admin';
        $admin->is_active = true;
        $admin->email_verified_at = now();
        $admin->save();

        Log::info("✅ Admin user created successfully: {$adminEmail}");
        Log::warning("⚠️  Default password: {$adminPassword} - Please change in production!");
    }
}

