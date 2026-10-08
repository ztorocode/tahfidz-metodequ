<?php

declare(strict_types=1);

[$request, $router] = require dirname(__DIR__) . '/bootstrap.php';

$router->dispatch($request);
