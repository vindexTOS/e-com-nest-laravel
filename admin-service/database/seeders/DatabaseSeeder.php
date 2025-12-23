<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed admin user
        $this->call(AdminSeeder::class);

        // Seed default user
        $this->call(DefaultUserSeeder::class);

        // Seed default categories
        $this->call(CategorySeeder::class);
    }
}
