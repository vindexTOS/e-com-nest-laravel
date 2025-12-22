<?php

namespace App\GraphQL\Mutations;

use App\Models\User;
use App\Services\AuthTokenService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Nuwave\Lighthouse\Support\Contracts\GraphQLContext;

class AuthMutator
{
    public function __construct(private readonly AuthTokenService $tokens)
    {
    }

    public function register($_, array $args): array
    {
        $data = Validator::make($args['input'] ?? $args, [
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'firstName' => 'required|string|max:255',
            'lastName' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
        ])->validate();

        $user = User::create([
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'first_name' => $data['firstName'],
            'last_name' => $data['lastName'],
            'phone' => $data['phone'] ?? null,
            'role' => 'customer',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $tokens = $this->tokens->generateTokens($user);

        return [
            'accessToken' => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
            'user' => $user,
        ];
    }

    public function login($_, array $args): array
    {
        $data = Validator::make($args['input'] ?? $args, [
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ])->validate();

        $user = User::where('email', $data['email'])->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials'],
            ]);
        }

        // Get the raw password from database to avoid cast issues
        $passwordHash = $user->getRawOriginal('password') ?? $user->getAttributes()['password'] ?? $user->password;

        if (!Hash::check($data['password'], $passwordHash)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials'],
            ]);
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Account is inactive'],
            ]);
        }

        $tokens = $this->tokens->generateTokens($user);

        return [
            'accessToken' => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
            'user' => $user,
        ];
    }

    public function adminLogin($_, array $args): array
    {
        $data = Validator::make($args['input'] ?? $args, [
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ])->validate();

        // Use withTrashed to ensure we check all users, but filter out deleted ones
        $user = User::where('email', $data['email'])->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials'],
            ]);
        }

        // Get the raw password from database to avoid cast issues
        $passwordHash = $user->getRawOriginal('password') ?? $user->getAttributes()['password'] ?? $user->password;

        if (!Hash::check($data['password'], $passwordHash)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials'],
            ]);
        }

        if (!$user->is_active || !$user->isAdmin()) {
            throw ValidationException::withMessages([
                'email' => ['Access denied. Admin role required.'],
            ]);
        }

        $tokens = $this->tokens->generateTokens($user);

        return [
            'accessToken' => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
            'user' => $user,
        ];
    }

    public function refresh($_, array $args): array
    {
        $data = Validator::make($args, [
            'refreshToken' => 'required|string',
        ])->validate();

        $refreshToken = $data['refreshToken'];

        if (Cache::get("blacklist:{$refreshToken}")) {
            throw ValidationException::withMessages([
                'refreshToken' => ['Token has been revoked'],
            ]);
        }

        $payload = $this->tokens->decodeToken($refreshToken);

        if (!$payload || !isset($payload['sub'])) {
            throw ValidationException::withMessages([
                'refreshToken' => ['Invalid refresh token'],
            ]);
        }

        $user = User::find($payload['sub']);

        if (!$user || !$user->is_active) {
            throw ValidationException::withMessages([
                'refreshToken' => ['User not found or inactive'],
            ]);
        }

        $tokens = $this->tokens->generateTokens($user);

        return [
            'accessToken' => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
        ];
    }

    public function logout($_, array $args, GraphQLContext $context): array
    {
        $request = $context->request();
        $token = $request->bearerToken();

        if ($token) {
            $payload = $this->tokens->decodeToken($token);
            if ($payload && isset($payload['exp'])) {
                $ttl = $payload['exp'] - time();
                if ($ttl > 0) {
                    Cache::put("blacklist:{$token}", true, $ttl);
                }
            }
        }

        if (!empty($args['refreshToken'])) {
            $refreshToken = $args['refreshToken'];
            $refreshPayload = $this->tokens->decodeToken($refreshToken);
            if ($refreshPayload && isset($refreshPayload['exp'])) {
                $refreshTtl = $refreshPayload['exp'] - time();
                if ($refreshTtl > 0) {
                    Cache::put("blacklist:{$refreshToken}", true, $refreshTtl);
                }
            }
        }

        return ['message' => 'Logged out successfully'];
    }
}


