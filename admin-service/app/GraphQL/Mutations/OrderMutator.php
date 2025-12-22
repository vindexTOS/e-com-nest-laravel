<?php

namespace App\GraphQL\Mutations;

use App\Events\NewOrderNotification;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Services\PaymentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderMutator
{
    public function __construct(
        private PaymentService $paymentService
    ) {}

    public function create($_, array $args): Order
    {
        $data = Validator::make($args['input'] ?? [], [
            'user_id' => 'required|uuid|exists:users,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'shipping_address' => 'nullable|string',
            'billing_address' => 'nullable|string',
            'payment_method' => 'nullable|string',
            'notes' => 'nullable|string',
        ])->validate();

        DB::beginTransaction();
        try {
            $orderNumber = 'ORD-' . strtoupper(Str::random(8));
            $subtotal = 0;
            $items = [];

            foreach ($data['items'] as $itemData) {
                $product = Product::findOrFail($itemData['product_id']);

                if (!$product->hasStock($itemData['quantity'])) {
                    DB::rollBack();
                    throw ValidationException::withMessages([
                        'items' => ["Insufficient stock for product: {$product->name}. Available: {$product->stock}, Requested: {$itemData['quantity']}"],
                    ]);
                }

                $unitPrice = $product->price;
                $totalPrice = $unitPrice * $itemData['quantity'];
                $subtotal += $totalPrice;

                $items[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_sku' => $product->sku,
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,
                ];

                // Deduct stock immediately
                $product->deductStock($itemData['quantity']);
                $product->save();
            }

            $tax = $subtotal * 0.1;
            $shipping = 10.00;
            $discount = 0;
            $total = $subtotal + $tax + $shipping - $discount;

            // Check user balance
            $user = User::findOrFail($data['user_id']);
            $userBalance = floatval($user->balance ?? 0);
            
            if ($userBalance < $total) {
                DB::rollBack();
                throw ValidationException::withMessages([
                    'balance' => ["Insufficient balance. Required: \${$total}, Available: \${$userBalance}. Please add funds to your account."],
                ]);
            }

            // Deduct balance from user
            $user->balance = $userBalance - $total;
            $user->save();

            $order = Order::create([
                'user_id' => $data['user_id'],
                'order_number' => $orderNumber,
                'status' => 'pending',
                'fulfillment_status' => 'unfulfilled',
                'subtotal' => $subtotal,
                'tax' => $tax,
                'shipping' => $shipping,
                'discount' => $discount,
                'total' => $total,
                'currency' => 'USD',
                'shipping_address' => $data['shipping_address'] ?? null,
                'billing_address' => $data['billing_address'] ?? null,
                'payment_method' => $data['payment_method'] ?? null,
                'payment_status' => 'pending',
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($items as $item) {
                OrderItem::create(array_merge($item, ['order_id' => $order->id]));
            }

            // Payment already processed via balance deduction
            $order->payment_status = 'paid';
            $order->payment_method = 'wallet_balance';
            $order->status = 'processing';
            $order->save();

            DB::commit();

            $freshOrder = $order->fresh(['user', 'items.product']);

            Redis::publish('order-events', json_encode([
                'event' => 'order.created',
                'data' => $freshOrder->toArray(),
                'timestamp' => now()->toISOString(),
            ]));

            $this->publishDatabaseEvent('orders', 'INSERT', $freshOrder);

            foreach ($freshOrder->items as $item) {
                $this->publishDatabaseEvent('order_items', 'INSERT', $item);
            }

            $notification = Notification::create([
                'user_id' => null,
                'type' => 'order_created',
                'title' => 'New Order Received',
                'message' => "Order {$orderNumber} placed by {$user->first_name} {$user->last_name} for \${$total}",
                'data' => [
                    'order_id' => $order->id,
                    'order_number' => $orderNumber,
                    'user_name' => "{$user->first_name} {$user->last_name}",
                    'user_email' => $user->email,
                    'total' => $total,
                    'items_count' => count($items),
                ],
            ]);

            $this->publishDatabaseEvent('notifications', 'INSERT', $notification);

            return $order->fresh(['user', 'items.product']);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function update($_, array $args): Order
    {
        $order = Order::findOrFail($args['id']);

        $data = Validator::make($args['input'] ?? [], [
            'status' => ['sometimes', Rule::in(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])],
            'fulfillment_status' => ['sometimes', Rule::in(['unfulfilled', 'partial', 'fulfilled'])],
            'payment_status' => 'nullable|string',
            'shipping_address' => 'nullable|string',
            'billing_address' => 'nullable|string',
            'notes' => 'nullable|string',
        ])->validate();

        if (isset($data['status'])) {
            $order->status = $data['status'];
            if ($data['status'] === 'shipped') {
                $order->shipped_at = now();
            } elseif ($data['status'] === 'delivered') {
                $order->delivered_at = now();
            }
        }

        if (isset($data['fulfillment_status'])) {
            $order->fulfillment_status = $data['fulfillment_status'];
            if ($data['fulfillment_status'] === 'fulfilled') {
                $order->fulfilled_at = now();
            }
        }

        $order->fill($data);
        $order->save();

        $freshOrder = $order->fresh(['user', 'items.product']);

        Redis::publish('order-events', json_encode([
            'event' => 'order.updated',
            'data' => $freshOrder->toArray(),
            'timestamp' => now()->toISOString(),
        ]));

        $this->publishDatabaseEvent('orders', 'UPDATE', $freshOrder);

        return $freshOrder;
    }

    public function fulfill($_, array $args): Order
    {
        $order = Order::with('items.product')->findOrFail($args['id']);

        if (!$order->canBeFulfilled()) {
            throw ValidationException::withMessages([
                'id' => ['Order cannot be fulfilled in current state'],
            ]);
        }

        DB::beginTransaction();
        try {
            foreach ($order->items as $item) {
                $product = $item->product;

                if (!$product->hasStock($item->quantity)) {
                    DB::rollBack();
                    throw ValidationException::withMessages([
                        'items' => ["Insufficient stock for product: {$product->name}. Available: {$product->stock}, Required: {$item->quantity}"],
                    ]);
                }

                $product->deductStock($item->quantity);
                $item->quantity_fulfilled = $item->quantity;
                $item->save();
            }

            $order->fulfillment_status = 'fulfilled';
            $order->fulfilled_at = now();
            $order->status = 'shipped';
            $order->shipped_at = now();
            $order->save();

            DB::commit();

            $freshOrder = $order->fresh(['user', 'items.product']);

            Redis::publish('order-events', json_encode([
                'event' => 'order.fulfilled',
                'data' => $freshOrder->toArray(),
                'timestamp' => now()->toISOString(),
            ]));

            $this->publishDatabaseEvent('orders', 'UPDATE', $freshOrder);

            return $freshOrder;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function delete($_, array $args): array
    {
        $order = Order::findOrFail($args['id']);
        $orderId = $order->id;

        Redis::publish('order-events', json_encode([
            'event' => 'order.deleted',
            'data' => ['id' => $orderId],
            'timestamp' => now()->toISOString(),
        ]));

        $this->publishDatabaseEvent('orders', 'DELETE', ['id' => $orderId], $orderId);

        $order->delete();

        return ['message' => 'Order deleted successfully'];
    }

    public function restore($_, array $args): array
    {
        $order = Order::withTrashed()->findOrFail($args['id']);
        $order->restore();

        $freshOrder = $order->fresh(['user', 'items.product']);

        Redis::publish('order-events', json_encode([
            'event' => 'order.restored',
            'data' => $freshOrder->toArray(),
            'timestamp' => now()->toISOString(),
        ]));

        $this->publishDatabaseEvent('orders', 'INSERT', $freshOrder);

        return ['message' => 'Order restored successfully'];
    }

    private function publishDatabaseEvent(string $table, string $operation, $data, ?string $id = null): void
    {
        try {
            $eventData = is_array($data) ? $data : $data->toArray();
            $eventId = $id ?? $eventData['id'] ?? null;

            if (!$eventId) {
                \Log::warning("Cannot publish database event: missing ID for table {$table}");
                return;
            }

            Redis::publish('database:events', json_encode([
                'table' => $table,
                'operation' => $operation,
                'data' => $eventData,
                'id' => $eventId,
                'timestamp' => now()->toISOString(),
            ]));
        } catch (\Exception $e) {
            \Log::warning("Failed to publish database event for {$table}: " . $e->getMessage());
        }
    }
}


