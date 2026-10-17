<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Whatsapp\WaController;
use App\Modules\Whatsapp\WaTemplateController;

return static function (Router $router): void {
    $controller = new WaController();
    $templates = new WaTemplateController();

    $router->get('/api/wa/status', [$controller, 'status']);
    $router->post('/api/wa/device', [$controller, 'device']);
    $router->post('/api/wa/qr', [$controller, 'qr']);
    $router->post('/api/wa/logout', [$controller, 'logout']);
    $router->post('/api/wa/reconnect', [$controller, 'reconnect']);

    $router->get('/api/wa/templates', [$templates, 'index']);
    $router->post('/api/wa/templates', [$templates, 'save']);

    $router->get('/api/wa/history', [$controller, 'history']);
    $router->post('/api/wa/resend', [$controller, 'resend']);
    $router->post('/api/wa/test-send', [$controller, 'testSend']);
};
