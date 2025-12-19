<?php

namespace App\Jobs;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SyncOrderToNestJS implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $order;

    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    public function handle(): void
    {
        try {
            $apiGatewayUrl = env('API_GATEWAY_URL', 'http://api-gateway:3000');
            $apiKey = 'ecom-service-api-key-2024';

            $orderData = [
                'id' => $this->order->id,
                'user_id' => $this->order->user_id,
                'order_number' => $this->order->order_number,
                'status' => $this->order->status,
                'fulfillment_status' => $this->order->fulfillment_status,
                'subtotal' => $this->order->subtotal,
                'tax' => $this->order->tax,
                'shipping' => $this->order->shipping,
                'discount' => $this->order->discount,
                'total' => $this->order->total,
                'currency' => $this->order->currency,
                'shipping_address' => $this->order->shipping_address,
                'billing_address' => $this->order->billing_address,
                'payment_method' => $this->order->payment_method,
                'payment_status' => $this->order->payment_status,
                'fulfilled_at' => $this->order->fulfilled_at?->toISOString(),
                'shipped_at' => $this->order->shipped_at?->toISOString(),
                'delivered_at' => $this->order->delivered_at?->toISOString(),
                'notes' => $this->order->notes,
                'created_at' => $this->order->created_at->toISOString(),
                'updated_at' => $this->order->updated_at->toISOString(),
                'items' => $this->order->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'order_id' => $item->order_id,
                        'product_id' => $item->product_id,
                        'product_name' => $item->product_name,
                        'product_sku' => $item->product_sku,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'total_price' => $item->total_price,
                        'quantity_fulfilled' => $item->quantity_fulfilled,
                    ];
                })->toArray(),
            ];

            $response = Http::withHeaders([
                'X-API-Key' => $apiKey,
                'Content-Type' => 'application/json',
            ])->post("{$apiGatewayUrl}/api/internal/orders/sync", $orderData);

            if ($response->successful()) {
                Log::info("Order {$this->order->id} synced to NestJS successfully");
            } else {
                Log::error("Failed to sync order {$this->order->id} to NestJS: " . $response->body());
                throw new \Exception("Sync failed: " . $response->body());
            }
        } catch (\Exception $e) {
            Log::error("Error syncing order to NestJS: " . $e->getMessage());
            throw $e;
        }
    }
}

