<?php

namespace App\GraphQL\Mutations;

use App\Models\Notification;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Validator;

class NotificationMutator
{
    public function markAsRead($_, array $args)
    {
        $data = Validator::make($args, [
            'id' => 'required|uuid|exists:notifications,id',
        ])->validate();

        $notification = Notification::findOrFail($data['id']);
        $notification->markAsRead();

        $this->publishDatabaseEvent('notifications', 'UPDATE', $notification->fresh());

        return $notification->fresh();
    }

    public function markAllAsRead($_, array $args)
    {
         $notificationsToUpdate = Notification::whereNull('user_id')
            ->whereNull('read_at')
            ->get();

        $count = Notification::whereNull('user_id')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        foreach ($notificationsToUpdate as $notification) {
            $notification->refresh();
            $this->publishDatabaseEvent('notifications', 'UPDATE', $notification);
        }

        return [
            'message' => 'All notifications marked as read',
            'count' => $count,
        ];
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

