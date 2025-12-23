<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class WebhookApiKeyMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $request->header('X-API-Key');
        $expectedKey = env('TEST_WEB_HOOK_KEY');

        if (!$expectedKey) {
            return response()->json(['error' => 'Webhook API key not configured'], 500);
        }

        if (!$apiKey || $apiKey !== $expectedKey) {
            return response()->json(['error' => 'Invalid API key'], 401);
        }

        return $next($request);
    }
}

