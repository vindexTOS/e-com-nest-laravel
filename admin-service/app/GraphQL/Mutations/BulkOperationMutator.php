<?php

namespace App\GraphQL\Mutations;

use App\Jobs\ProcessProductImport;
use App\Models\Product;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class BulkOperationMutator
{
    public function importProducts($_, array $args): array
    {
        $data = Validator::make($args, [
            'file' => 'required|file|mimes:csv,txt',
        ])->validate();

        $filePath = $data['file']->store('imports', 'local');
        ProcessProductImport::dispatch($filePath);

        return ['message' => 'Product import queued. Processing in background.'];
    }

    public function bulkDelete($_, array $args): array
    {
        $data = Validator::make($args, [
            'ids' => 'required|array|min:1',
            'ids.*' => 'required|uuid|exists:products,id',
        ])->validate();

        $count = Product::whereIn('id', $data['ids'])->delete();

        return ['message' => "{$count} products deleted successfully"];
    }

    public function bulkUpdate($_, array $args): array
    {
        $data = Validator::make($args, [
            'ids' => 'required|array|min:1',
            'ids.*' => 'required|uuid|exists:products,id',
            'data' => 'required|array|min:1',
            'data.status' => ['sometimes', Rule::in(['draft', 'active', 'archived'])],
        ])->validate();

        $count = Product::whereIn('id', $data['ids'])->update($data['data']);

        return ['message' => "{$count} products updated successfully"];
    }
}


