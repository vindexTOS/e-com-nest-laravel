<?php

namespace App\Observers;

use Illuminate\Support\Facades\Log;

trait DatabaseEventPublisher
{
    protected function publishEvent(string $table, string $operation, $data, ?string $id = null): void
    {
        try {
            $eventData = is_array($data) ? $data : $data->toArray();
            $eventId = $id ?? $eventData['id'] ?? null;

            if (!$eventId) {
                Log::warning("Cannot publish database event: missing ID for table {$table}");
                return;
            }

            $event = [
                'table' => $table,
                'operation' => $operation,
                'data' => $eventData,
                'id' => $eventId,
                'timestamp' => now()->toISOString(),
            ];

            $redis = new \Redis();
            $redis->connect(env('REDIS_HOST', 'redis'), (int) env('REDIS_PORT', 6379));
            $result = $redis->publish('database:events', json_encode($event));
            $redis->close();
            
            Log::info("Published event to database:events - table: {$table}, operation: {$operation}, id: {$eventId}, subscribers: {$result}");
        } catch (\Exception $e) {
            Log::error("Failed to publish database event for {$table}: " . $e->getMessage(), ['exception' => $e]);
        }
    }
}

