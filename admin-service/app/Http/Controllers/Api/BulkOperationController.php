<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Jobs\ProcessProductImport;

class BulkOperationController extends Controller
{
    public function importProducts(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
        ]);

        $file = $request->file('file');
        $filePath = $file->store('imports', 'local');

        ProcessProductImport::dispatch($filePath);

        return response()->json([
            'message' => 'Product import queued. Processing in background.',
        ], 202);
    }

    public function exportProducts(Request $request)
    {
        $products = Product::with('category')->get();

        $filename = 'products_' . now()->format('Y-m-d') . '.csv';
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() use ($products) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Name', 'SKU', 'Price', 'Stock', 'Status', 'Category']);

            foreach ($products as $product) {
                fputcsv($file, [
                    $product->name,
                    $product->sku,
                    $product->price,
                    $product->stock,
                    $product->status,
                    $product->category->name ?? 'N/A',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function bulkDelete(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'required|uuid|exists:products,id',
        ]);

        $count = Product::whereIn('id', $request->input('ids'))->delete();

        return response()->json([
            'message' => "{$count} products deleted successfully",
        ]);
    }

    public function bulkUpdate(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'required|uuid|exists:products,id',
            'data' => 'required|array',
        ]);

        $count = Product::whereIn('id', $request->input('ids'))
            ->update($request->input('data'));

        return response()->json([
            'message' => "{$count} products updated successfully",
        ]);
    }
}

