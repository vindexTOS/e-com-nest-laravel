<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'statusCode' => 401,
                'message' => 'Unauthorized',
            ], 401);
        }

        if (!in_array($user->role, $roles)) {
            return response()->json([
                'statusCode' => 403,
                'message' => 'Access denied. Required roles: ' . implode(', ', $roles),
            ], 403);
        }

        return $next($request);
    }
}

