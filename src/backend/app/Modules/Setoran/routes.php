<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Setoran\SetoranController;
use App\Modules\Setoran\SetoranSubmissionController;

return static function (Router $router): void {
    $controller = new SetoranController();
    $submission = new SetoranSubmissionController();

    $router->get("/api/setoran-reviews", [$controller, "index"]);
    $router->post("/api/setoran-reviews", [$controller, "store"]);
    $router->post("/api/setoran-reviews/remove", [$controller, "remove"]);

    $router->post("/api/setoran-submissions", [$submission, "store"]);
    $router->get("/api/setoran-submissions", [$submission, "index"]);
    $router->get("/api/setoran-submissions/audio", [$submission, "audio"]);
};
