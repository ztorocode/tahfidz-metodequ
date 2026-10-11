<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\RegisterController;
use App\Modules\Auth\VerifyEmailController;

return static function (Router $router): void {
    $router->post('/api/auth/register', new RegisterController());
    $router->get('/api/auth/verify-email', new VerifyEmailController());
    $router->post('/api/auth/verify-email', new VerifyEmailController());
};
