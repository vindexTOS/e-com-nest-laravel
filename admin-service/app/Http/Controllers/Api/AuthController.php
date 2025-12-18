<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'statusCode' => 400,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 400);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'statusCode' => 401,
                'message' => 'Invalid credentials',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'statusCode' => 403,
                'message' => 'Account is inactive',
            ], 403);
        }

        if (!$user->isAdmin()) {
            return response()->json([
                'statusCode' => 403,
                'message' => 'Access denied. Admin role required.',
            ], 403);
        }

        $tokens = $this->generateTokens($user);

        return response()->json([
            'accessToken' => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'firstName' => $user->first_name,
                'lastName' => $user->last_name,
                'role' => $user->role,
            ],
        ], 200);
    }

    public function refresh(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'refreshToken' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'statusCode' => 400,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 400);
        }

        try {
            $refreshToken = $request->refreshToken;
            
            $isBlacklisted = Cache::get("blacklist:{$refreshToken}");
            if ($isBlacklisted) {
                return response()->json([
                    'statusCode' => 401,
                    'message' => 'Token has been revoked',
                ], 401);
            }

            $payload = $this->decodeToken($refreshToken);
            
            if (!$payload || !isset($payload['sub'])) {
                return response()->json([
                    'statusCode' => 401,
                    'message' => 'Invalid refresh token',
                ], 401);
            }

            $user = User::find($payload['sub']);

            if (!$user || !$user->is_active) {
                return response()->json([
                    'statusCode' => 401,
                    'message' => 'User not found or inactive',
                ], 401);
            }

            $tokens = $this->generateTokens($user);

            return response()->json([
                'accessToken' => $tokens['accessToken'],
                'refreshToken' => $tokens['refreshToken'],
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'statusCode' => 401,
                'message' => 'Invalid refresh token',
            ], 401);
        }
    }

    public function logout(Request $request): JsonResponse
    {
        try {
            $token = $request->bearerToken();
            
            if ($token) {
                $payload = $this->decodeToken($token);
                if ($payload && isset($payload['exp'])) {
                    $ttl = $payload['exp'] - time();
                    if ($ttl > 0) {
                        Cache::put("blacklist:{$token}", true, $ttl);
                    }
                }
            }

            if ($request->has('refreshToken')) {
                $refreshToken = $request->input('refreshToken');
                $refreshPayload = $this->decodeToken($refreshToken);
                if ($refreshPayload && isset($refreshPayload['exp'])) {
                    $refreshTtl = $refreshPayload['exp'] - time();
                    if ($refreshTtl > 0) {
                        Cache::put("blacklist:{$refreshToken}", true, $refreshTtl);
                    }
                }
            }

            return response()->json([
                'message' => 'Logged out successfully',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Logged out successfully',
            ], 200);
        }
    }

    public function user(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'email' => $user->email,
            'firstName' => $user->first_name,
            'lastName' => $user->last_name,
            'role' => $user->role,
            'isActive' => $user->is_active,
        ], 200);
    }

    private function generateTokens(User $user): array
    {
        $jwtSecret = config('jwt.secret');
        $accessTokenExpiration = $this->parseExpiration(config('jwt.access_token_expiration', '1h'));
        $refreshTokenExpiration = $this->parseExpiration(config('jwt.refresh_token_expiration', '7d'));

        $payload = [
            'sub' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'iat' => time(),
        ];

        $accessTokenPayload = array_merge($payload, ['exp' => time() + $accessTokenExpiration]);
        $refreshTokenPayload = array_merge($payload, ['exp' => time() + $refreshTokenExpiration]);

        $accessToken = $this->encodeToken($accessTokenPayload, $jwtSecret);
        $refreshToken = $this->encodeToken($refreshTokenPayload, $jwtSecret);

        return [
            'accessToken' => $accessToken,
            'refreshToken' => $refreshToken,
        ];
    }

    private function parseExpiration(string $expiration): int
    {
        if (is_numeric($expiration)) {
            return (int) $expiration;
        }

        $unit = substr($expiration, -1);
        $value = (int) substr($expiration, 0, -1);

        return match ($unit) {
            's' => $value,
            'm' => $value * 60,
            'h' => $value * 3600,
            'd' => $value * 86400,
            default => 3600,
        };
    }

    private function encodeToken(array $payload, string $secret): string
    {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
        $signature = hash_hmac('sha256', $base64UrlHeader . '.' . $base64UrlPayload, $secret, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $base64UrlHeader . '.' . $base64UrlPayload . '.' . $base64UrlSignature;
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

            if (isset($payload['exp']) && $payload['exp'] < time()) {
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

