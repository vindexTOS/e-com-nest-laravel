<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use OpenApi\Attributes as OA;

class ImageController extends Controller
{
    #[OA\Get(
        path: '/api/images/{path}',
        summary: 'Get image by path',
        tags: ['Images'],
        parameters: [
            new OA\Parameter(
                name: 'path',
                in: 'path',
                required: true,
                description: 'Image path (e.g., products/image.jpg)',
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Image file'),
            new OA\Response(response: 404, description: 'Image not found'),
        ]
    )]
    public function show(Request $request, string $path): Response
    {
        // Decode the path if it's URL encoded
        $path = urldecode($path);
        
        // Security: Only allow images from public storage
        if (!Storage::disk('public')->exists($path)) {
            abort(404, 'Image not found');
        }

        // Get the file
        $file = Storage::disk('public')->get($path);
        $mimeType = Storage::disk('public')->mimeType($path);

        return response($file, 200)
            ->header('Content-Type', $mimeType)
            ->header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    }
}

