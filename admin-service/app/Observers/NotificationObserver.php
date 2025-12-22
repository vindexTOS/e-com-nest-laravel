<?php

namespace App\Observers;

use App\Events\NewOrderNotification;
use App\Models\Notification;
use Illuminate\Support\Facades\Log;

class NotificationObserver
{
    use DatabaseEventPublisher;
    public function created(Notification $notification): void
    {
        $this->publishEvent('notifications', 'INSERT', $notification);
        
        if ($notification->user_id === null) {
            event(new NewOrderNotification($notification->toArray()));
        }
    }

    public function updated(Notification $notification): void
    {
        $this->publishEvent('notifications', 'UPDATE', $notification);
    }

    public function deleted(Notification $notification): void
    {
        $this->publishEvent('notifications', 'DELETE', ['id' => $notification->id], $notification->id);
    }

    public function restored(Notification $notification): void
    {
        $this->publishEvent('notifications', 'INSERT', $notification);
    }

}

