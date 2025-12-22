<?php

namespace App\GraphQL\Mutations;

use App\Models\User;
use App\Services\AuthTokenService;
use GraphQL\Error\Error;
use Nuwave\Lighthouse\Support\Contracts\GraphQLContext;

class BalanceMutator
{
    public function __construct(private readonly AuthTokenService $authTokenService)
    {
    }

    private function getAuthenticatedUser(GraphQLContext $context): User
    {
        $request = $context->request();
        $authHeader = $request->header('Authorization');
        
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            throw new Error('You must be logged in');
        }

        $token = substr($authHeader, 7);
        $payload = $this->authTokenService->decodeToken($token);
        
        if (!$payload || !isset($payload['sub'])) {
            throw new Error('Invalid or expired token');
        }

        $user = User::find($payload['sub']);
        
        if (!$user) {
            throw new Error('User not found');
        }

        return $user;
    }

    public function addBalance($_, array $args, GraphQLContext $context): array
    {
        $user = $this->getAuthenticatedUser($context);

        $input = $args['input'];
        $amount = floatval($input['amount']);

        if ($amount <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        if ($amount > 10000) {
            throw new Error('Maximum deposit is $10,000');
        }

        // Mock card validation (just check format)
        $cardNumber = preg_replace('/\s+/', '', $input['card_number']);
        if (strlen($cardNumber) < 13 || strlen($cardNumber) > 19) {
            throw new Error('Invalid card number');
        }

        // Add balance to user
        $user->balance = floatval($user->balance ?? 0) + $amount;
        $user->save();

        return [
            'balance' => $user->balance,
            'message' => "Successfully added \${$amount} to your balance"
        ];
    }

    public function getBalance($_, array $args, GraphQLContext $context): array
    {
        $user = $this->getAuthenticatedUser($context);

        return [
            'balance' => floatval($user->balance ?? 0),
            'message' => 'Balance retrieved successfully'
        ];
    }
}
