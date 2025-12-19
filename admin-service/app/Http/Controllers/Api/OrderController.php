<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Order\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Order::with(['user', 'items.product']);

        if ($request->boolean('trashed')) {
            $query->withTrashed();
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('fulfillment_status')) {
            $query->where('fulfillment_status', $request->input('fulfillment_status'));
        }

        if ($request->has('order_number')) {
            $query->where('order_number', $request->input('order_number'));
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate($request->input('limit', 10));

        return OrderResource::collection($orders);
    }

    public function store(StoreOrderRequest $request): JsonResponse
    {
        $validated = $request->validated();

        DB::beginTransaction();
        try {
            $orderNumber = 'ORD-' . strtoupper(Str::random(8));
            $subtotal = 0;
            $items = [];

            foreach ($validated['items'] as $itemData) {
                $product = Product::findOrFail($itemData['product_id']);

                if (!$product->hasStock($itemData['quantity'])) {
                    DB::rollBack();
                    return response()->json([
                        'message' => "Insufficient stock for product: {$product->name}. Available: {$product->stock}, Requested: {$itemData['quantity']}"
                    ], 400);
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
            }

            $tax = $subtotal * 0.1;
            $shipping = 10.00;
            $discount = 0;
            $total = $subtotal + $tax + $shipping - $discount;

            $order = Order::create([
                'user_id' => $validated['user_id'],
                'order_number' => $orderNumber,
                'status' => 'pending',
                'fulfillment_status' => 'unfulfilled',
                'subtotal' => $subtotal,
                'tax' => $tax,
                'shipping' => $shipping,
                'discount' => $discount,
                'total' => $total,
                'currency' => 'USD',
                'shipping_address' => $validated['shipping_address'] ?? null,
                'billing_address' => $validated['billing_address'] ?? null,
                'payment_method' => $validated['payment_method'] ?? null,
                'payment_status' => 'pending',
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($items as $item) {
                OrderItem::create(array_merge($item, ['order_id' => $order->id]));
            }

            DB::commit();

            dispatch(new \App\Jobs\SyncOrderToNestJS($order));

            return (new OrderResource($order->load(['user', 'items.product'])))->response()->setStatusCode(201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Order creation failed: ' . $e->getMessage()], 500);
        }
    }

    public function show(string $id): OrderResource
    {
        $order = Order::with(['user', 'items.product'])->findOrFail($id);
        return new OrderResource($order);
    }

    public function update(Request $request, string $id): OrderResource
    {
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'status' => ['sometimes', Rule::in(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])],
            'fulfillment_status' => ['sometimes', Rule::in(['unfulfilled', 'partial', 'fulfilled'])],
            'payment_status' => 'nullable|string',
            'shipping_address' => 'nullable|string',
            'billing_address' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if (isset($validated['status'])) {
            $order->status = $validated['status'];
            if ($validated['status'] === 'shipped') {
                $order->shipped_at = now();
            } elseif ($validated['status'] === 'delivered') {
                $order->delivered_at = now();
            }
        }

        if (isset($validated['fulfillment_status'])) {
            $order->fulfillment_status = $validated['fulfillment_status'];
            if ($validated['fulfillment_status'] === 'fulfilled') {
                $order->fulfilled_at = now();
            }
        }

        $order->fill($validated);
        $order->save();

        dispatch(new \App\Jobs\SyncOrderToNestJS($order));

        return new OrderResource($order->load(['user', 'items.product']));
    }

    public function fulfill(string $id): OrderResource
    {
        $order = Order::with('items.product')->findOrFail($id);

        if (!$order->canBeFulfilled()) {
            return response()->json(['message' => 'Order cannot be fulfilled in current state'], 400);
        }

        DB::beginTransaction();
        try {
            foreach ($order->items as $item) {
                $product = $item->product;

                if (!$product->hasStock($item->quantity)) {
                    DB::rollBack();
                    return response()->json([
                        'message' => "Insufficient stock for product: {$product->name}. Available: {$product->stock}, Required: {$item->quantity}"
                    ], 400);
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

            dispatch(new \App\Jobs\SyncOrderToNestJS($order));

            return new OrderResource($order->load(['user', 'items.product']));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Order fulfillment failed: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(string $id): JsonResponse
    {
        $order = Order::findOrFail($id);
        $order->delete();

        return response()->json(null, 204);
    }

    public function restore(string $id): JsonResponse
    {
        $order = Order::withTrashed()->findOrFail($id);
        $order->restore();

        return response()->json(['message' => 'Order restored successfully']);
    }

    public function reports(Request $request): JsonResponse
    {
        $period = $request->input('period', 'daily');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $query = Order::where('status', '!=', 'cancelled');

        if ($period === 'daily') {
            $dateFrom = $dateFrom ?: now()->startOfDay();
            $dateTo = $dateTo ?: now()->endOfDay();
        } elseif ($period === 'weekly') {
            $dateFrom = $dateFrom ?: now()->startOfWeek();
            $dateTo = $dateTo ?: now()->endOfWeek();
        } elseif ($period === 'monthly') {
            $dateFrom = $dateFrom ?: now()->startOfMonth();
            $dateTo = $dateTo ?: now()->endOfMonth();
        }

        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $totalOrders = $query->count();
        $totalRevenue = $query->sum('total');
        $averageOrderValue = $totalOrders > 0 ? $totalRevenue / $totalOrders : 0;

        $ordersByStatus = Order::whereBetween('created_at', [$dateFrom, $dateTo])
            ->where('status', '!=', 'cancelled')
            ->selectRaw('status, count(*) as count, sum(total) as revenue')
            ->groupBy('status')
            ->get();

        return response()->json([
            'period' => $period,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'total_orders' => $totalOrders,
            'total_revenue' => (float) $totalRevenue,
            'average_order_value' => (float) $averageOrderValue,
            'orders_by_status' => $ordersByStatus,
        ]);
    }

    public function export(Request $request)
    {
        $format = $request->input('format', 'csv');
        $orders = Order::with(['user', 'items'])->get();

        if ($format === 'csv') {
            $filename = 'orders_' . now()->format('Y-m-d') . '.csv';
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ];

            $callback = function() use ($orders) {
                $file = fopen('php://output', 'w');
                fputcsv($file, ['Order Number', 'User', 'Status', 'Total', 'Date']);

                foreach ($orders as $order) {
                    fputcsv($file, [
                        $order->order_number,
                        $order->user->email ?? 'N/A',
                        $order->status,
                        $order->total,
                        $order->created_at->format('Y-m-d H:i:s'),
                    ]);
                }

                fclose($file);
            };

            return response()->stream($callback, 200, $headers);
        }

        return response()->json(['message' => 'PDF export not implemented yet'], 501);
    }
}
