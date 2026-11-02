<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Users\ProfileController;
use App\Modules\Users\StudentEnrollmentController;

return static function (Router $router): void {
    $router->get('/api/users/me', [new ProfileController(), 'show']);
    $router->get('/api/users/me/enrollment', [new StudentEnrollmentController(), 'show']);
    $router->get('/api/users/search', [new ProfileController(), 'search']);
    $router->put('/api/users/me', [new ProfileController(), 'update']);
    $router->post('/api/users/me/password', [new ProfileController(), 'password']);
};
