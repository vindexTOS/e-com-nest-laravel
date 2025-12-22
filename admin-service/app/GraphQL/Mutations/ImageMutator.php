<?php

namespace App\GraphQL\Mutations;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ImageMutator
{
    public function uploadProductImage($_, array $args): array
    {
        $data = Validator::make($args, [
            'file' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
        ])->validate();

        $image = $data['file'];
        $imageName = time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
        $imagePath = $image->storeAs('products', $imageName, 'public');

        // Return the path and full URL
        return [
            'path' => $imagePath,
            'url' => Storage::disk('public')->url($imagePath),
            'filename' => $imageName,
        ];
    }
}

