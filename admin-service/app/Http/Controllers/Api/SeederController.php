<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Database\Seeders\ProductSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SeederController extends Controller
{
    public function seedProducts(Request $request): JsonResponse
    {
        $count = $request->input('count', 10);

        $seeder = new ProductSeeder();
        $seeder->run($count);

        return response()->json(['message' => "{$count} products seeded successfully."]);
    }

    public function seedUsers(Request $request): JsonResponse
    {
        $count = $request->input('count', 10);

        $seeder = new UserSeeder();
        $seeder->run($count);

        return response()->json(['message' => "{$count} users seeded successfully."]);
    }
}
