<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Progress\ProgressController;

return static function (Router $router): void {
    $controller = new ProgressController();

    $router->get('/api/progress', [$controller, 'index']);
    $router->post('/api/progress', [$controller, 'save']);
    $router->get('/api/progress/student', [$controller, 'student']);
};
