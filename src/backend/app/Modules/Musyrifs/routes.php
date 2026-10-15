<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Musyrifs\InviteController;
use App\Modules\Musyrifs\MusyrifController;
use App\Modules\Musyrifs\SantriController;

return static function (Router $router): void {
    $router->get('/api/pondoks/musyrifs', [new MusyrifController(), 'index']);
    $router->post('/api/pondoks/musyrifs', [new MusyrifController(), 'store']);
    $router->get('/api/pondoks/santris', [new SantriController(), 'index']);
    $router->get('/api/pondok-invites', [new InviteController(), 'index']);
    $router->post('/api/pondok-invites', [new InviteController(), 'store']);
    $router->post('/api/pondok-invites/revoke', [new InviteController(), 'revoke']);
    $router->get('/api/pondok-invites/info', [new InviteController(), 'info']);
    $router->get('/api/pondok-invites/mine', [new InviteController(), 'mine']);
    $router->post('/api/pondok-invites/accept-mine', [new InviteController(), 'acceptMine']);
    $router->post('/api/pondok-invites/accept', [new InviteController(), 'accept']);
};
