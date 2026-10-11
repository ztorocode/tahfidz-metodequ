<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\RegisterController;

return static function (Router $router): void {
    $router->post('/api/auth/register', new RegisterController());
};
