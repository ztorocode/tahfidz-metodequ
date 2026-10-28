<?php

declare(strict_types=1);

use App\Core\Router;

return static function (Router $router): void {
    $registerPublicDonations = require dirname(__DIR__) . '/app/Modules/PublicDonations/routes.php';
    $registerPublicDonations($router);

    $registerHealth = require dirname(__DIR__) . '/app/Modules/Health/routes.php';
    $registerHealth($router);

    $registerAuth = require dirname(__DIR__) . '/app/Modules/Auth/routes.php';
    $registerAuth($router);

    $registerMusyrifs = require dirname(__DIR__) . '/app/Modules/Musyrifs/routes.php';
    $registerMusyrifs($router);

    $registerPlatform = require dirname(__DIR__) . '/app/Modules/Platform/routes.php';
    $registerPlatform($router);

    $registerUsers = require dirname(__DIR__) . '/app/Modules/Users/routes.php';
    $registerUsers($router);

    $registerWa = require dirname(__DIR__) . '/app/Modules/Whatsapp/routes.php';
    $registerWa($router);

    $registerPondoks = require dirname(__DIR__) . '/app/Modules/Pondoks/routes.php';
    $registerPondoks($router);

    $registerHalaqah = require dirname(__DIR__) . '/app/Modules/Halaqah/routes.php';
    $registerHalaqah($router);

    $registerProgress = require dirname(__DIR__) . '/app/Modules/Progress/routes.php';
    $registerProgress($router);

    $registerSetoran = require dirname(__DIR__) . '/app/Modules/Setoran/routes.php';
    $registerSetoran($router);
};
