<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewOrderNotification implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $notification;
 
    public function __construct(array $notification)
    {
        $this->notification = $notification;
    }

    
    public function broadcastOn(): array
    {
        return [
            new Channel('admin-notifications'),
        ];
    }

    
    public function broadcastAs(): string
    {
        return 'new-notification';
    }

    
    public function broadcastWith(): array
    {
        return $this->notification;
    }
}

