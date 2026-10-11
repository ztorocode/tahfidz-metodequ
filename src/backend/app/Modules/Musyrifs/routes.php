<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Musyrifs\MusyrifController;

return static function (Router $router): void {
    $router->get('/api/pondoks/musyrifs', [new MusyrifController(), 'index']);
    $router->post('/api/pondoks/musyrifs', [new MusyrifController(), 'store']);
};
