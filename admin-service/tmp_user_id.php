<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$user = $app->make('App\\Models\\User')::first();
echo $user ? $user->id : "none";
echo PHP_EOL;

