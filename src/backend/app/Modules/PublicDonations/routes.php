<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\PublicDonations\PublicUstadzController;

return static function (Router $router): void {
    $router->get('/api/public/ustadz', [new PublicUstadzController(), 'index']);
};
