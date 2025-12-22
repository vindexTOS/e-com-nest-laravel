<?php

namespace App\Observers;

use App\Models\Order;
use Illuminate\Support\Facades\Log;

class OrderObserver
{
    use DatabaseEventPublisher;
    public function created(Order $order): void
    {
        Log::info("OrderObserver: created event fired for order {$order->id}");
        try {
            $freshOrder = $order->fresh(['user', 'items.product']);
            $this->publishEvent('orders', 'INSERT', $freshOrder);
            
            foreach ($freshOrder->items as $item) {
                $this->publishEvent('order_items', 'INSERT', $item);
            }
        } catch (\Exception $e) {
            Log::warning("Failed to load order relations for created event: " . $e->getMessage());
            $this->publishEvent('orders', 'INSERT', $order->fresh());
        }
    }

    public function updated(Order $order): void
    {
        try {
            $this->publishEvent('orders', 'UPDATE', $order->fresh(['user', 'items.product']));
        } catch (\Exception $e) {
            Log::warning("Failed to load order relations for updated event: " . $e->getMessage());
            $this->publishEvent('orders', 'UPDATE', $order->fresh());
        }
    }

    public function deleted(Order $order): void
    {
        $this->publishEvent('orders', 'DELETE', ['id' => $order->id], $order->id);
    }

    public function restored(Order $order): void
    {
        try {
            $this->publishEvent('orders', 'INSERT', $order->fresh(['user', 'items.product']));
        } catch (\Exception $e) {
            Log::warning("Failed to load order relations for restored event: " . $e->getMessage());
            $this->publishEvent('orders', 'INSERT', $order->fresh());
        }
    }

}

