<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Halaqah\HalaqahController;

return static function (Router $router): void {
    $controller = new HalaqahController();

    $router->get('/api/pondoks/halaqahs', [$controller, 'index']);
    $router->get('/api/pondoks/halaqahs/mine', [$controller, 'mine']);
    $router->post('/api/pondoks/halaqahs', [$controller, 'store']);
    $router->post('/api/pondoks/halaqahs/members', [$controller, 'members']);
};
