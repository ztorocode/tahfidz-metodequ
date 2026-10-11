<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

final class LoginController
{
    public function __invoke(Request $request): never
    {
        try {
            $pdo = Database::connection();
            $service = new SessionService($pdo, new LoginValidator());

            $session = $service->login($request->body(), [
                'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
                'user_agent' => $request->headers['user-agent'] ?? '',
                'device_id' => (string) ($request->body()['device_id'] ?? ''),
            ]);

            Response::json([
                'success' => true,
                'message' => 'Login berhasil.',
                'data' => $session,
            ]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }
}
