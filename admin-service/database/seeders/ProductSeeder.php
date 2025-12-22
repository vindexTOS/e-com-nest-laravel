<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Faker\Factory;

class ProductSeeder extends Seeder
{
    private static $uniqueCounter = 1000;

    public function run(int $count = 10): void
    {
        $faker = Factory::create();

        $categories = Category::where('is_active', true)->get();

        if ($categories->isEmpty()) {
            throw new \Exception('No active categories found. Please run CategorySeeder first.');
        }

        $statuses = ['draft', 'active', 'archived'];

        for ($i = 0; $i < $count; $i++) {
            $name = ucfirst($faker->unique()->words(3, true)) . ' ' . self::$uniqueCounter++;
            $slug = Str::slug($name);
            $description = $faker->paragraphs(2, true);
            $categoryId = $categories->random()->id;

            Product::create([
                'name' => $name,
                'slug' => $slug,
                'description' => $description,
                'sku' => 'SKU-' . strtoupper(Str::random(8)),
                'price' => $faker->randomFloat(2, 5, 500),
                'compare_at_price' => $faker->boolean(30) ? $faker->randomFloat(2, 6, 700) : null,
                'cost_price' => $faker->randomFloat(2, 3, 300),
                'stock' => $faker->numberBetween(0, 500),
                'low_stock_threshold' => $faker->numberBetween(5, 20),
                'weight' => $faker->randomFloat(2, 0.1, 50),
                'status' => $faker->randomElement($statuses),
                'is_featured' => $faker->boolean(20),
                'meta_title' => $name . ' - ' . $faker->catchPhrase,
                'meta_description' => $faker->sentence(12),
                'category_id' => $categoryId,
            ]);
        }
    }
}
