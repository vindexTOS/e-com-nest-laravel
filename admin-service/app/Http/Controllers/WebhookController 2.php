<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Validator;

class WebhookController extends Controller
{
    public function markNotificationAsRead(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id' => 'required|uuid|exists:notifications,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        $notification = Notification::findOrFail($request->id);
        $notification->markAsRead();

        $this->publishDatabaseEvent('notifications', 'UPDATE', $notification->fresh());

        return response()->json([
            'success' => true,
            'notification' => [
                'id' => $notification->id,
                'read_at' => $notification->read_at,
                'updated_at' => $notification->updated_at,
            ],
        ]);
    }

    public function markAllNotificationsAsRead(Request $request)
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

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read',
            'count' => $count,
        ]);
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

