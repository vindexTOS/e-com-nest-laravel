<?php

namespace App\Observers;

use App\Models\Category;
use Illuminate\Support\Facades\Log;

class CategoryObserver
{
    use DatabaseEventPublisher;
    public function created(Category $category): void
    {
        try {
            $this->publishEvent('categories', 'INSERT', $category->fresh(['parent', 'children']));
        } catch (\Exception $e) {
            $this->publishEvent('categories', 'INSERT', $category->fresh());
        }
    }

    public function updated(Category $category): void
    {
        try {
            $this->publishEvent('categories', 'UPDATE', $category->fresh(['parent', 'children']));
        } catch (\Exception $e) {
            $this->publishEvent('categories', 'UPDATE', $category->fresh());
        }
    }

    public function deleted(Category $category): void
    {
        $this->publishEvent('categories', 'DELETE', ['id' => $category->id], $category->id);
    }

    public function restored(Category $category): void
    {
        try {
            $this->publishEvent('categories', 'INSERT', $category->fresh(['parent', 'children']));
        } catch (\Exception $e) {
            $this->publishEvent('categories', 'INSERT', $category->fresh());
        }
    }

}

