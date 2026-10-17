<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Pondoks\DashboardController;

return static function (Router $router): void {
    $dashboard = new DashboardController();

    $router->get('/api/pondoks/summary', [$dashboard, 'summary']);
};
