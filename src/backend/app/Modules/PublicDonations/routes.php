<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\PublicDonations\PublicUstadzController;

return static function (Router $router): void {
    $public = new PublicUstadzController();
    $router->get('/api/public/ustadz', [$public, 'index']);
    $router->get('/api/public/ustadz/detail', [$public, 'detail']);
    $router->get('/api/public/ustadz/photo', [$public, 'photo']);
    $router->get('/api/ustadz/santri', [$public, 'students']);
    $router->post('/api/donatur/activate', [$public, 'activateDonor']);

    $profile = new \App\Modules\PublicDonations\UstadzDonationProfileController();
    $router->get('/api/ustadz/donation-profile', [$profile, 'show']);
    $router->post('/api/ustadz/donation-profile/bank', [$profile, 'saveBank']);
    $router->post('/api/ustadz/donation-profile/photo', [$profile, 'uploadPhoto']);
    $router->post('/api/ustadz/donation-profile/photo/delete', [$profile, 'deletePhoto']);
};
