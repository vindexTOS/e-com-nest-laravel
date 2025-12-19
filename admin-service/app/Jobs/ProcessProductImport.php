<?php

namespace App\Jobs;

use App\Models\Product;
use App\Models\Category;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProcessProductImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $filePath;

    public function __construct(string $filePath)
    {
        $this->filePath = $filePath;
    }

    public function handle(): void
    {
        $file = Storage::disk('local')->get($this->filePath);
        $lines = explode("\n", $file);
        $headers = str_getcsv(array_shift($lines));

        foreach ($lines as $line) {
            if (empty(trim($line))) {
                continue;
            }

            $data = str_getcsv($line);
            $row = array_combine($headers, $data);

            $category = null;
            if (isset($row['category']) && !empty($row['category'])) {
                $category = Category::firstOrCreate(
                    ['name' => $row['category']],
                    ['slug' => Str::slug($row['category']), 'is_active' => true]
                );
            }

            Product::updateOrCreate(
                ['sku' => $row['sku'] ?? Str::random(10)],
                [
                    'name' => $row['name'] ?? 'Unnamed Product',
                    'slug' => Str::slug($row['name'] ?? 'unnamed-product'),
                    'description' => $row['description'] ?? null,
                    'price' => $row['price'] ?? 0,
                    'stock' => $row['stock'] ?? 0,
                    'status' => $row['status'] ?? 'draft',
                    'category_id' => $category?->id,
                ]
            );
        }

        Storage::disk('local')->delete($this->filePath);
    }
}

