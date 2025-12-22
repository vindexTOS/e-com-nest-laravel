<?php

namespace App\GraphQL\Mutations;

use App\Models\Category;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CategoryMutator
{
    public function create($_, array $args): Category
    {
        $data = Validator::make($args['input'] ?? [], [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|uuid|exists:categories,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
        ])->validate();

        if (!empty($data['image'])) {
            $image = $data['image'];
            $imageName = time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('categories', $imageName, 'public');
            $data['image'] = $imagePath;
        }

        $data['slug'] = Str::slug($data['name']);
        
        if (!isset($data['sort_order'])) {
            $data['sort_order'] = 0;
        }
        
        if (!isset($data['is_active'])) {
            $data['is_active'] = true;
        }
        
        $category = Category::create($data);
        
        try {
            return $category->fresh(['parent', 'children']);
        } catch (\Exception $e) {
            return $category->fresh();
        }
    }

    public function update($_, array $args): Category
    {
        $category = Category::findOrFail($args['id']);

        $data = Validator::make($args['input'] ?? [], [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'parent_id' => [
                'nullable',
                'uuid',
                Rule::exists('categories', 'id')->where(function ($query) use ($category) {
                    return $query->where('id', '!=', $category->id);
                }),
            ],
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
        ])->validate();

        if (!empty($data['image'])) {
            if ($category->image) {
                Storage::disk('public')->delete($category->image);
            }
            $image = $data['image'];
            $imageName = time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('categories', $imageName, 'public');
            $data['image'] = $imagePath;
        }

        if (!empty($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $category->update($data);
        
        try {
            return $category->fresh(['parent', 'children']);
        } catch (\Exception $e) {
            return $category->fresh();
        }
    }

    public function delete($_, array $args): array
    {
        $category = Category::findOrFail($args['id']);

        if ($category->products()->exists()) {
            throw ValidationException::withMessages([
                'id' => ['Cannot delete category with associated products.'],
            ]);
        }

        if ($category->children()->exists()) {
            throw ValidationException::withMessages([
                'id' => ['Cannot delete category with child categories.'],
            ]);
        }

        $category->delete();

        return ['message' => 'Category deleted successfully'];
    }

    public function restore($_, array $args): array
    {
        $category = Category::withTrashed()->findOrFail($args['id']);
        $category->restore();

        return ['message' => 'Category restored successfully'];
    }
}


