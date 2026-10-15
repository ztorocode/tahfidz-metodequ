<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Users\ProfileController;

return static function (Router $router): void {
    $router->get('/api/users/me', [new ProfileController(), 'show']);
    $router->put('/api/users/me', [new ProfileController(), 'update']);
    $router->post('/api/users/me/password', [new ProfileController(), 'password']);
};
