<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Musyrifs\InviteController;
use App\Modules\Musyrifs\MusyrifController;

return static function (Router $router): void {
    $router->get('/api/pondoks/musyrifs', [new MusyrifController(), 'index']);
    $router->post('/api/pondoks/musyrifs', [new MusyrifController(), 'store']);
    $router->get('/api/pondok-invites', [new InviteController(), 'index']);
    $router->post('/api/pondok-invites', [new InviteController(), 'store']);
    $router->post('/api/pondok-invites/revoke', [new InviteController(), 'revoke']);
    $router->get('/api/pondok-invites/info', [new InviteController(), 'info']);
    $router->post('/api/pondok-invites/accept', [new InviteController(), 'accept']);
};
