<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Health\HealthController;

return static function (Router $router): void {
    $router->get('/api/health', new HealthController());
};
