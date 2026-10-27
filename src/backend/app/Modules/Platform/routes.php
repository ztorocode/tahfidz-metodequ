<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Platform\PlatformMusyrifController;
use App\Modules\Platform\PlatformSantriController;

return static function (Router $router): void {
    $controller = new PlatformMusyrifController();

    $router->post('/api/platform/musyrifs', [$controller, 'store']);
    $router->get('/api/platform/musyrif-invites', [$controller, 'inviteIndex']);
    $router->post('/api/platform/musyrif-invites', [$controller, 'inviteStore']);
    $router->post('/api/platform/musyrif-invites/revoke', [$controller, 'inviteRevoke']);
    $router->post('/api/platform/musyrif-invites/regenerate', [$controller, 'inviteRegenerate']);
    $router->post('/api/platform/musyrif-invites/standing-link', [$controller, 'inviteStandingLink']);
    $router->get('/api/platform/musyrif-invites/info', [$controller, 'inviteInfo']);
    $router->post('/api/platform/musyrif-invites/accept', [$controller, 'inviteAccept']);

    $santri = new PlatformSantriController();
    $router->post('/api/platform/santris', [$santri, 'store']);
    $router->post('/api/platform/santri-invites', [$santri, 'inviteStore']);
    $router->post('/api/platform/santri-invites/standing-link', [$santri, 'inviteStandingLink']);
    $router->get('/api/platform/santri-invites/info', [$santri, 'inviteInfo']);
    $router->post('/api/platform/santri-invites/accept', [$santri, 'inviteAccept']);
};
