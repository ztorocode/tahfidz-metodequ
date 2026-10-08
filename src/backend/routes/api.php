<?php

declare(strict_types=1);

use App\Core\Router;

return static function (Router $router): void {
    $registerHealth = require dirname(__DIR__) . '/app/Modules/Health/routes.php';
    $registerHealth($router);
};
