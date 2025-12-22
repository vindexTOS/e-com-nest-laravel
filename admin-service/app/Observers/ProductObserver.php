<?php

namespace App\Observers;

use App\Models\Product;
use Illuminate\Support\Facades\Log;

class ProductObserver
{
    use DatabaseEventPublisher;
    public function created(Product $product): void
    {
        Log::info("ProductObserver: created event fired for product {$product->id}");
        $this->publishEvent('products', 'INSERT', $product->fresh('category'));
    }

    public function updated(Product $product): void
    {
        $this->publishEvent('products', 'UPDATE', $product->fresh('category'));
    }

    public function deleted(Product $product): void
    {
        $this->publishEvent('products', 'DELETE', ['id' => $product->id], $product->id);
    }

    public function restored(Product $product): void
    {
        $this->publishEvent('products', 'INSERT', $product->fresh('category'));
    }

}

