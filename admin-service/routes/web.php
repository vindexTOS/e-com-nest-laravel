<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    try {
        return view('app');
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()], 500);
    }
});

Route::get('/test', function () {
    return response()->json(['message' => 'Laravel is working!', 'app_key' => config('app.key')]);
});
