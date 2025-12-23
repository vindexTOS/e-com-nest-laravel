<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WebhookController;

Route::prefix('webhook')->middleware('webhook.api')->group(function () {
    Route::post('/notifications/mark-as-read', [WebhookController::class, 'markNotificationAsRead']);
    Route::post('/notifications/mark-all-read', [WebhookController::class, 'markAllNotificationsAsRead']);
});
