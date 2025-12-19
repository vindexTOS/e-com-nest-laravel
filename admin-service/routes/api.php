<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\BulkOperationController;
use App\Http\Controllers\Api\SeederController;
use App\Http\Controllers\Api\ImageController;

// Public image serving route (no auth required)
Route::get('/images/{path}', [ImageController::class, 'show'])->where('path', '.*');

// Laravel Admin API - All routes under /admin-api prefix
Route::prefix('admin-api')->group(function () {
    // Public auth routes
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/refresh', [AuthController::class, 'refresh']);
        
        Route::middleware(['auth.api'])->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
        });
    });

    // Admin auth routes
    Route::prefix('admin')->group(function () {
        Route::post('/login', [AuthController::class, 'adminLogin']);
        Route::post('/refresh', [AuthController::class, 'refresh']);
        
        Route::middleware(['auth.api', 'role:admin'])->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/user', [AuthController::class, 'user']);
        });
    });

    // Admin protected routes
    Route::prefix('admin')->middleware(['auth.api', 'role:admin'])->group(function () {
        Route::apiResource('categories', CategoryController::class);
        Route::post('/categories/{id}/restore', [CategoryController::class, 'restore']);
        
        Route::apiResource('products', ProductController::class);
        Route::post('/products/{id}/restore', [ProductController::class, 'restore']);
        Route::post('/products/bulk/delete', [BulkOperationController::class, 'bulkDelete']);
        Route::post('/products/bulk/update', [BulkOperationController::class, 'bulkUpdate']);
        Route::post('/products/import', [BulkOperationController::class, 'importProducts']);
        Route::get('/products/export', [BulkOperationController::class, 'exportProducts']);
        
        Route::apiResource('orders', OrderController::class);
        Route::post('/orders/{id}/fulfill', [OrderController::class, 'fulfill']);
        Route::post('/orders/{id}/restore', [OrderController::class, 'restore']);
        Route::get('/orders/reports/sales', [OrderController::class, 'reports']);
        Route::get('/orders/export', [OrderController::class, 'export']);
        
        Route::apiResource('users', UserController::class);
        
        Route::post('/seed/products', [SeederController::class, 'seedProducts']);
        Route::post('/seed/users', [SeederController::class, 'seedUsers']);
    });
});


