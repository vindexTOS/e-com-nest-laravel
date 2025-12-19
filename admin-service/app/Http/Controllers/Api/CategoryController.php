<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Category\StoreCategoryRequest;
use App\Http\Requests\Category\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

class CategoryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Category::with(['parent', 'children']);

        if ($request->boolean('trashed')) {
            $query->withTrashed();
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        }

        if ($request->has('parent_id')) {
            $query->where('parent_id', $request->input('parent_id'));
        } else if ($request->boolean('root_only')) {
            $query->whereNull('parent_id');
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $categories = $query->paginate($request->input('limit', 10));

        return CategoryResource::collection($categories);
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $imageName = time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('categories', $imageName, 'public');
            $validated['image'] = $imagePath;
        }

        $validated['slug'] = Str::slug($validated['name']);
        $category = Category::create($validated);

        return (new CategoryResource($category->load(['parent', 'children'])))->response()->setStatusCode(201);
    }

    public function show(string $id): CategoryResource
    {
        $category = Category::with(['parent', 'children', 'products'])->findOrFail($id);
        return new CategoryResource($category);
    }

    public function update(UpdateCategoryRequest $request, string $id): CategoryResource
    {
        $category = Category::findOrFail($id);
        $validated = $request->validated();

        if ($request->hasFile('image')) {
            if ($category->image) {
                Storage::disk('public')->delete($category->image);
            }
            $image = $request->file('image');
            $imageName = time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('categories', $imageName, 'public');
            $validated['image'] = $imagePath;
        }

        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $category->update($validated);

        return new CategoryResource($category->load(['parent', 'children']));
    }

    public function destroy(string $id): JsonResponse
    {
        $category = Category::findOrFail($id);

        if ($category->products()->exists()) {
            return response()->json(['message' => 'Cannot delete category with associated products.'], 409);
        }

        if ($category->children()->exists()) {
            return response()->json(['message' => 'Cannot delete category with child categories.'], 409);
        }

        $category->delete();

        return response()->json(null, 204);
    }

    public function restore(string $id): JsonResponse
    {
        $category = Category::withTrashed()->findOrFail($id);
        $category->restore();

        return response()->json(['message' => 'Category restored successfully']);
    }
}
