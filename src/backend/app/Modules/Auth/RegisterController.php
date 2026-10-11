<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

final class RegisterController
{
    public function __invoke(Request $request): never
    {
        try {
            $pdo = Database::connection();
            $service = new RegistrationService(
                $pdo,
                new RegisterRepository($pdo),
                new RegisterValidator(),
            );

            $registration = $service->register($request->body());

            Response::json([
                'success' => true,
                'message' => 'Registrasi berhasil.',
                'data' => $registration,
            ], 201);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }
}
