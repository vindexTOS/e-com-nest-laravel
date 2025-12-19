<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'image',
        'sku',
        'price',
        'compare_at_price',
        'cost_price',
        'stock',
        'low_stock_threshold',
        'weight',
        'status',
        'is_featured',
        'meta_title',
        'meta_description',
        'category_id',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'compare_at_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'stock' => 'integer',
        'low_stock_threshold' => 'integer',
        'weight' => 'decimal:2',
        'is_featured' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class, 'product_id');
    }

    public function hasStock(int $quantity): bool
    {
        return $this->stock >= $quantity;
    }

    public function deductStock(int $quantity): bool
    {
        if (!$this->hasStock($quantity)) {
            return false;
        }
        $this->stock -= $quantity;
        return $this->save();
    }

    public function addStock(int $quantity): bool
    {
        $this->stock += $quantity;
        return $this->save();
    }
}
