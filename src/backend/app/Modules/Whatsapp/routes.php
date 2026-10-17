<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Whatsapp\WaController;

return static function (Router $router): void {
    $controller = new WaController();

    $router->get('/api/wa/status', [$controller, 'status']);
    $router->post('/api/wa/qr', [$controller, 'qr']);
    $router->post('/api/wa/logout', [$controller, 'logout']);
    $router->post('/api/wa/reconnect', [$controller, 'reconnect']);
};
