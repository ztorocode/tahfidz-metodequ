<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

final class ResendVerificationController
{
    public function __invoke(Request $request): never
    {
        try {
            $body = $request->body();
            $identifier = (string) ($body['email'] ?? $body['identifier'] ?? '');
            $result = (new ResendVerificationService(Database::connection()))->resend($identifier);

            Response::json([
                'success' => true,
                'message' => $result['message'],
                'data' => $result,
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
