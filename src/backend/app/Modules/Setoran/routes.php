<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Setoran\SetoranController;

return static function (Router $router): void {
    $controller = new SetoranController();

    $router->get('/api/setoran-reviews', [$controller, 'index']);
    $router->post('/api/setoran-reviews', [$controller, 'store']);
    $router->post('/api/setoran-reviews/remove', [$controller, 'remove']);
};
