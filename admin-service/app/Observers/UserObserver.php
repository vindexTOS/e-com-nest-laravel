<?php

namespace App\Observers;

use App\Models\User;
use Illuminate\Support\Facades\Log;

class UserObserver
{
    use DatabaseEventPublisher;
    public function created(User $user): void
    {
        Log::info("UserObserver: created event fired for user {$user->id}");
        $user->makeVisible(['password']);
        $userData = $user->getAttributes();
        if (!isset($userData['password'])) {
            $userData['password'] = $user->getOriginal('password') ?? $user->password;
        }
        $this->publishEvent('users', 'INSERT', $userData);
    }

    public function updated(User $user): void
    {
        $user->makeVisible(['password']);
        $userData = $user->getAttributes();
        if (!isset($userData['password'])) {
            $userData['password'] = $user->getOriginal('password') ?? $user->password;
        }
        $this->publishEvent('users', 'UPDATE', $userData);
    }

    public function deleted(User $user): void
    {
        $this->publishEvent('users', 'DELETE', ['id' => $user->id], $user->id);
    }

    public function restored(User $user): void
    {
        $user->makeVisible(['password']);
        $userData = $user->getAttributes();
        if (!isset($userData['password'])) {
            $userData['password'] = $user->getOriginal('password') ?? $user->password;
        }
        $this->publishEvent('users', 'INSERT', $userData);
    }

}

