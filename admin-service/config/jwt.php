<?php

return [
    'secret' => env('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production'),
    'access_token_expiration' => env('JWT_EXPIRATION', '1h'),
    'refresh_token_expiration' => env('JWT_REFRESH_EXPIRATION', '7d'),
];

