<?php

declare(strict_types=1);

use App\Core\Env;
use App\Core\Request;
use App\Core\Response;
use App\Core\Router;

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $path = __DIR__ . '/app/' . str_replace('\\', '/', $relative) . '.php';

    if (is_file($path)) {
        require $path;
    }
});

// MetodeQu intentionally treats src/backend/.env as the application-level
// source of truth. Values in this file override environment variables
// inherited from the container or Kubernetes Pod.
Env::load(__DIR__ . '/.env', override: true);

set_exception_handler(static function (Throwable $exception): void {
    $debug = filter_var(getenv('APP_DEBUG') ?: 'false', FILTER_VALIDATE_BOOL);

    Response::json([
        'success' => false,
        'message' => 'Internal Server Error',
        'error' => $debug ? $exception->getMessage() : null,
    ], 500);
});

$request = Request::capture();
$router = new Router();

(require __DIR__ . '/routes/api.php')($router);

return [$request, $router];
