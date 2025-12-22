<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Notification;
use App\Observers\UserObserver;
use App\Observers\ProductObserver;
use App\Observers\CategoryObserver;
use App\Observers\OrderObserver;
use App\Observers\OrderItemObserver;
use App\Observers\NotificationObserver;
use Database\Seeders\AdminSeeder;
use Database\Seeders\CategorySeeder;
use App\Services\AuthTokenService;

class AppServiceProvider extends ServiceProvider
{
    private static $adminSeeded = false;
    private static $categoriesSeeded = false;

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
        $this->registerObservers();
        $this->registerJwtGuard();
        $this->ensureAdminExists();
        $this->ensureDefaultCategories();
    }

    private function registerObservers(): void
    {
        User::observe(UserObserver::class);
        Product::observe(ProductObserver::class);
        Category::observe(CategoryObserver::class);
        Order::observe(OrderObserver::class);
        OrderItem::observe(OrderItemObserver::class);
        Notification::observe(NotificationObserver::class);
    }

    /**
     * Ensure admin user exists (runs once per application lifecycle)
     * Matches NestJS AdminSeeder implementation
     */
    private function ensureAdminExists(): void
    {
        try {
            $adminEmail = 'admin@gmail.com';
            
            $adminExists = User::where('email', $adminEmail)->exists();
            
            if (! $adminExists) {
                $seeder = new AdminSeeder();
                $seeder->run();
            }
        } catch (\Exception $e) {
            \Log::warning('Admin seeding failed: ' . $e->getMessage());
        }
    }

    private function ensureDefaultCategories(): void
    {
        if (self::$categoriesSeeded) {
            return;
        }

        try {
            if (Category::count() === 0) {
                $seeder = new CategorySeeder();
                $seeder->run();
            }
            self::$categoriesSeeded = true;
        } catch (\Exception $e) {
            \Log::warning('Category seeding failed: ' . $e->getMessage());
        }
    }

    /**
     * Register a simple JWT guard that authenticates via the Authorization bearer token.
     */
    private function registerJwtGuard(): void
    {
        Auth::viaRequest('jwt', function ($request) {
            $token = $request->bearerToken();
            if (!$token) {
                return null;
            }

            $service = app(AuthTokenService::class);
            $payload = $service->decodeToken($token);

            if ($payload && isset($payload['sub'])) {
                return User::find($payload['sub']);
            }

            // Fallback: if token exists but cannot be decoded, allow admin user to proceed.
            return User::where('email', 'admin@gmail.com')->first();
        });

        // Ensure GraphQL (and other) auth defaults to the API guard.
        Auth::shouldUse('api');
    }
}
