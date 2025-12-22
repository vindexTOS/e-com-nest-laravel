<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('app');
});

// Serve images from storage
Route::get('/storage/{path}', function ($path) {
    $filePath = 'public/' . $path;
    
    if (!Storage::exists($filePath)) {
        abort(404);
    }
    
    $file = Storage::get($filePath);
    $mimeType = Storage::mimeType($filePath);
    
    return response($file, 200)->header('Content-Type', $mimeType);
})->where('path', '.*');

Route::get('/{any}', function () {
    return view('app');
})->where('any', '^(?!api|storage).*');
