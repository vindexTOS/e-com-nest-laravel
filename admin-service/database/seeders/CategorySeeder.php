<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Electronics',
                'slug' => 'electronics',
                'description' => 'Electronic devices and gadgets',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Clothing',
                'slug' => 'clothing',
                'description' => 'Apparel and fashion items',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Home & Garden',
                'slug' => 'home-garden',
                'description' => 'Home improvement and garden supplies',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Sports & Outdoors',
                'slug' => 'sports-outdoors',
                'description' => 'Sports equipment and outdoor gear',
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'name' => 'Books',
                'slug' => 'books',
                'description' => 'Books and reading materials',
                'is_active' => true,
                'sort_order' => 5,
            ],
            [
                'name' => 'Toys & Games',
                'slug' => 'toys-games',
                'description' => 'Toys, games, and entertainment',
                'is_active' => true,
                'sort_order' => 6,
            ],
            [
                'name' => 'Health & Beauty',
                'slug' => 'health-beauty',
                'description' => 'Health and beauty products',
                'is_active' => true,
                'sort_order' => 7,
            ],
            [
                'name' => 'Food & Beverages',
                'slug' => 'food-beverages',
                'description' => 'Food items and beverages',
                'is_active' => true,
                'sort_order' => 8,
            ],
        ];

        foreach ($categories as $categoryData) {
            $category = Category::firstOrCreate(
                ['slug' => $categoryData['slug']],
                $categoryData
            );
            
            if ($category->wasRecentlyCreated) {
                $category->fresh(['parent', 'children']);
            }
        }
    }
}



