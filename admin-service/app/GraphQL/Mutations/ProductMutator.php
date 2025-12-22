<?php

namespace App\GraphQL\Mutations;

use App\Models\Product;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductMutator
{
    public function create($_, array $args): Product
    {
        $data = Validator::make($args['input'] ?? [], [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'sku' => 'required|string|max:255|unique:products,sku',
            'price' => 'required|numeric|min:0',
            'compare_at_price' => 'nullable|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'weight' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:draft,active,archived',
            'is_featured' => 'nullable|boolean',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'category_id' => 'nullable|uuid|exists:categories,id',
            'slug' => 'sometimes|string|max:255',
        ])->validate();

        if (!empty($data['image'])) {
            $image = $data['image'];
            $imageName = time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('products', $imageName, 'public');
            $data['image'] = $imagePath;
        }

        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $product = Product::create($data);
        $freshProduct = $product->fresh('category');

        $this->publishProductUpdate($freshProduct, 'create');
        $this->publishDatabaseEvent('products', 'INSERT', $freshProduct);

        return $freshProduct;
    }

    public function update($_, array $args): Product
    {
        $product = Product::findOrFail($args['id']);

        $data = Validator::make($args['input'] ?? [], [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'sku' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('products')->ignore($product->id),
            ],
            'price' => 'sometimes|required|numeric|min:0',
            'compare_at_price' => 'nullable|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'weight' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:draft,active,archived',
            'is_featured' => 'nullable|boolean',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'category_id' => 'nullable|uuid|exists:categories,id',
            'slug' => 'sometimes|string|max:255',
        ])->validate();

        if (!empty($data['image'])) {
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }
            $image = $data['image'];
            $imageName = time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('products', $imageName, 'public');
            $data['image'] = $imagePath;
        }

        if (!empty($data['name']) && empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $product->update($data);
        $freshProduct = $product->fresh('category');

        $this->publishProductUpdate($freshProduct, 'update');
        $this->publishDatabaseEvent('products', 'UPDATE', $freshProduct);

        return $freshProduct;
    }

    public function delete($_, array $args): array
    {
        $product = Product::findOrFail($args['id']);
        $productId = $product->id;

        $this->publishProductUpdate($product, 'delete');
        $this->publishDatabaseEvent('products', 'DELETE', ['id' => $productId], $productId);

        $product->delete();

        return ['message' => 'Product deleted successfully'];
    }

    public function restore($_, array $args): array
    {
        $product = Product::withTrashed()->findOrFail($args['id']);
        $product->restore();
        $freshProduct = $product->fresh('category');

        $this->publishProductUpdate($freshProduct, 'restore');
        $this->publishDatabaseEvent('products', 'INSERT', $freshProduct);

        return ['message' => 'Product restored successfully'];
    }

    private function publishProductUpdate(Product $product, string $action): void
    {
        try {
            Redis::publish('product-updates', json_encode([
                'action' => $action,
                'product' => $product->toArray(),
                'timestamp' => now()->toISOString(),
            ]));
        } catch (\Exception $e) {
            \Log::warning('Failed to publish product update to Redis: ' . $e->getMessage());
        }
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


