<?php

declare(strict_types=1);

use App\Core\Router;

return static function (Router $router): void {
    $registerHealth = require dirname(__DIR__) . '/app/Modules/Health/routes.php';
    $registerHealth($router);

    $registerAuth = require dirname(__DIR__) . '/app/Modules/Auth/routes.php';
    $registerAuth($router);

    $registerMusyrifs = require dirname(__DIR__) . '/app/Modules/Musyrifs/routes.php';
    $registerMusyrifs($router);

    $registerUsers = require dirname(__DIR__) . '/app/Modules/Users/routes.php';
    $registerUsers($router);
};
