<?php

namespace App\Services;

use App\Models\User;

class AuthTokenService
{
    public function generateTokens(User $user): array
    {
        $jwtSecret = 'TEST';
        $accessTokenExpiration = $this->parseExpiration(config('jwt.access_token_expiration', '1h'));
        $refreshTokenExpiration = $this->parseExpiration(config('jwt.refresh_token_expiration', '7d'));

        $payload = [
            'sub' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'first_name' => $user->first_name ?? $user->firstName ?? null,
            'last_name' => $user->last_name ?? $user->lastName ?? null,
            'iat' => time(),
        ];

        $accessTokenPayload = array_merge($payload, ['exp' => time() + $accessTokenExpiration]);
        $refreshTokenPayload = array_merge($payload, ['exp' => time() + $refreshTokenExpiration]);

        return [
            'accessToken' => $this->encodeToken($accessTokenPayload, $jwtSecret),
            'refreshToken' => $this->encodeToken($refreshTokenPayload, $jwtSecret),
        ];
    }

    public function decodeToken(string $token): ?array
    {
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return null;
            }

            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);

            if (isset($payload['exp']) && $payload['exp'] < time()) {
                return null;
            }

            return $payload;
        } catch (\Exception $e) {
            return null;
        }
    }

    public function verifyToken(string $token, string $secret): bool
    {
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return false;
            }

            [$header, $payload, $signature] = $parts;
            $expectedSignature = hash_hmac('sha256', $header . '.' . $payload, $secret, true);
            $expectedBase64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($expectedSignature));

            return hash_equals($expectedBase64Signature, $signature);
        } catch (\Exception $e) {
            return false;
        }
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
}


