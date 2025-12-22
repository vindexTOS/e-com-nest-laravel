<?php

namespace App\Observers;

use App\Models\OrderItem;
use Illuminate\Support\Facades\Log;

class OrderItemObserver
{
    use DatabaseEventPublisher;
    public function created(OrderItem $orderItem): void
    {
        $this->publishEvent('order_items', 'INSERT', $orderItem);
    }

    public function updated(OrderItem $orderItem): void
    {
        $this->publishEvent('order_items', 'UPDATE', $orderItem);
    }

    public function deleted(OrderItem $orderItem): void
    {
        $this->publishEvent('order_items', 'DELETE', ['id' => $orderItem->id], $orderItem->id);
    }

    public function restored(OrderItem $orderItem): void
    {
        $this->publishEvent('order_items', 'INSERT', $orderItem);
    }

}

