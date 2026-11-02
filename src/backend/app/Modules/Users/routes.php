<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Users\ProfileController;
use App\Modules\Users\StudentEnrollmentController;
use App\Modules\Users\StudentHalaqahCatalogController;

return static function (Router $router): void {
    $router->get('/api/users/me', [new ProfileController(), 'show']);
    $router->get('/api/users/me/enrollment', [new StudentEnrollmentController(), 'show']);
    $catalog = new StudentHalaqahCatalogController();
    $router->get('/api/students/halaqahs', [$catalog, 'catalog']);
    $router->post('/api/students/halaqahs/apply', [$catalog, 'apply']);
    $router->get('/api/students/halaqahs/applications', [$catalog, 'applications']);
    $router->post('/api/students/halaqahs/applications/review', [$catalog, 'review']);
    $router->get('/api/users/search', [new ProfileController(), 'search']);
    $router->put('/api/users/me', [new ProfileController(), 'update']);
    $router->post('/api/users/me/password', [new ProfileController(), 'password']);
};
