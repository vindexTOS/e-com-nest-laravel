<?php

namespace App\GraphQL\Mutations;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Redis;
use Illuminate\Validation\Rule;

class UserMutator
{
    public function create($_, array $args): User
    {
        $data = Validator::make($args['input'] ?? [], [
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'firstName' => 'sometimes|required|string|max:255',
            'lastName' => 'sometimes|required|string|max:255',
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'role' => ['required', Rule::in(['customer', 'admin'])],
            'isActive' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ])->validate();

        $user = User::create([
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'first_name' => $data['firstName'] ?? $data['first_name'] ?? '',
            'last_name' => $data['lastName'] ?? $data['last_name'] ?? '',
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'],
            'is_active' => $data['isActive'] ?? $data['is_active'] ?? true,
            'email_verified_at' => now(),
        ]);

        $freshUser = $user->fresh();

        $this->publishDatabaseEvent('users', 'INSERT', $freshUser);

        return $freshUser;
    }

    public function update($_, array $args): User
    {
        $user = User::findOrFail($args['id']);

        $data = Validator::make($args['input'] ?? [], [
            'email' => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($user->id)],
            'password' => 'sometimes|string|min:6',
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'role' => ['sometimes', 'required', Rule::in(['customer', 'admin'])],
            'is_active' => 'nullable|boolean',
        ])->validate();

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);
        $freshUser = $user->fresh();

        $this->publishDatabaseEvent('users', 'UPDATE', $freshUser);

        return $freshUser;
    }

    public function delete($_, array $args): array
    {
        $user = User::findOrFail($args['id']);
        $userId = $user->id;

        $this->publishDatabaseEvent('users', 'DELETE', ['id' => $userId], $userId);

        $user->delete();

        return ['message' => 'User deleted successfully'];
    }

    public function restore($_, array $args): array
    {
        $user = User::withTrashed()->findOrFail($args['id']);
        $user->restore();
        $freshUser = $user->fresh();

        $this->publishDatabaseEvent('users', 'INSERT', $freshUser);

        return ['message' => 'User restored successfully'];
    }

    private function publishDatabaseEvent(string $table, string $operation, $data, ?string $id = null): void
    {
        try {
            $eventData = is_array($data) ? $data : $data->toArray();
            $eventId = $id ?? $eventData['id'] ?? null;

            if (!$eventId) {
                \Log::warning("Cannot publish database event: missing ID for table {$table}");
                return;
            }

            Redis::publish('database:events', json_encode([
                'table' => $table,
                'operation' => $operation,
                'data' => $eventData,
                'id' => $eventId,
                'timestamp' => now()->toISOString(),
            ]));
        } catch (\Exception $e) {
            \Log::warning("Failed to publish database event for {$table}: " . $e->getMessage());
        }
    }
}


