<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Cache;
use App\Models\User;
use Database\Seeders\AdminSeeder;

class AppServiceProvider extends ServiceProvider
{
    private static $adminSeeded = false;

    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (Schema::hasTable('users') && ! self::$adminSeeded) {
            $this->ensureAdminExists();
            self::$adminSeeded = true;
        }
    }

    /**
     * Ensure admin user exists (runs once per application lifecycle)
     */
    private function ensureAdminExists(): void
    {
        $adminEmail = 'admin@gmail.com';
        $cacheKey = 'admin_user_exists';
        
        $adminExists = Cache::remember($cacheKey, 3600, function () use ($adminEmail) {
            return User::where('email', $adminEmail)->exists();
        });
        
        if (! $adminExists) {
            $seeder = new AdminSeeder();
            $seeder->run();
            Cache::put($cacheKey, true, 3600);
        }
    }
}
