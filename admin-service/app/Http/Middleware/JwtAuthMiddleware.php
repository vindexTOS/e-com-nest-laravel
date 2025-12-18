<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;
use App\Models\User;

class JwtAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json([
                'statusCode' => 401,
                'message' => 'Unauthorized - No token provided',
            ], 401);
        }

        $isBlacklisted = Cache::get("blacklist:{$token}");
        if ($isBlacklisted) {
            return response()->json([
                'statusCode' => 401,
                'message' => 'Token has been revoked',
            ], 401);
        }

        $payload = $this->decodeToken($token);

        if (!$payload || !isset($payload['sub'])) {
            return response()->json([
                'statusCode' => 401,
                'message' => 'Invalid token',
            ], 401);
        }

        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return response()->json([
                'statusCode' => 401,
                'message' => 'Token expired',
            ], 401);
        }

        $user = User::find($payload['sub']);

        if (!$user) {
            return response()->json([
                'statusCode' => 401,
                'message' => 'User not found',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'statusCode' => 403,
                'message' => 'User account is inactive',
            ], 403);
        }

        $request->setUserResolver(function () use ($user) {
            return $user;
        });

        return $next($request);
    }

    private function decodeToken(string $token): ?array
    {
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return null;
            }

            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);
            
            if (!$this->verifyToken($token, config('jwt.secret'))) {
                return null;
            }

            return $payload;
        } catch (\Exception $e) {
            return null;
        }
    }

    private function verifyToken(string $token, string $secret): bool
    {
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return false;
            }

            $header = $parts[0];
            $payload = $parts[1];
            $signature = $parts[2];

            $expectedSignature = hash_hmac('sha256', $header . '.' . $payload, $secret, true);
            $expectedBase64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($expectedSignature));

            return hash_equals($expectedBase64Signature, $signature);
        } catch (\Exception $e) {
            return false;
        }
    }
}

