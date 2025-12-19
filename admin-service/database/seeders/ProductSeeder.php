<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Faker\Factory as Faker;

class ProductSeeder extends Seeder
{
    public function run(int $count = 10): void
    {
        $faker = Faker::create();
        $categories = Category::all();

        if ($categories->isEmpty()) {
            $defaultCategory = Category::create([
                'name' => 'Uncategorized',
                'slug' => 'uncategorized',
                'description' => 'Default category for products',
                'is_active' => true,
                'sort_order' => 0,
            ]);
            $categories = collect([$defaultCategory]);
        }

        $statuses = ['draft', 'active', 'archived'];

        for ($i = 0; $i < $count; $i++) {
            $name = $faker->words(3, true);
            $slug = Str::slug($name) . '-' . $faker->unique()->numberBetween(1000, 9999);

            Product::create([
                'name' => ucwords($name),
                'slug' => $slug,
                'description' => $faker->paragraph(3),
                'sku' => 'SKU-' . strtoupper(Str::random(8)),
                'price' => $faker->randomFloat(2, 10, 1000),
                'compare_at_price' => $faker->boolean(30) ? $faker->randomFloat(2, 100, 1200) : null,
                'cost_price' => $faker->randomFloat(2, 5, 500),
                'stock' => $faker->numberBetween(0, 500),
                'low_stock_threshold' => $faker->numberBetween(5, 20),
                'weight' => $faker->randomFloat(2, 0.1, 50),
                'status' => $faker->randomElement($statuses),
                'is_featured' => $faker->boolean(20),
                'meta_title' => $faker->sentence(4),
                'meta_description' => $faker->sentence(10),
                'category_id' => $faker->boolean(80) ? $categories->random()->id : null,
            ]);
        }
    }
}
