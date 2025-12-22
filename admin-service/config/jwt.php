<?php

return [
    'secret' => env('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production'),
    // Extend access token lifetime to 7 days (was 1 hour)
    'access_token_expiration' => env('JWT_EXPIRATION', '7d'),
    'refresh_token_expiration' => env('JWT_REFRESH_EXPIRATION', '7d'),
];

