<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$service = $app->make('App\\Services\\AuthTokenService');
var_export($service->decodeToken('TOKEN_HERE'));
echo PHP_EOL;

