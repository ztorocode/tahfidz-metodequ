<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\WaGateway;

final class OtpController
{
    public function request(Request $request): never
    {
        try {
            $pdo = Database::connection();
            $service = new OtpService($pdo, WaGateway::fromEnv());
            $result = $service->request((string) ($request->body()['phone'] ?? ''));

            Response::json([
                'success' => true,
                'message' => 'Kode OTP dikirim via WhatsApp.',
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

    public function verify(Request $request): never
    {
        try {
            $pdo = Database::connection();
            $body = $request->body();
            $otp = new OtpService($pdo, WaGateway::fromEnv());
            $user = $otp->verify(
                (string) ($body['phone'] ?? ''),
                (string) ($body['code'] ?? $body['otp'] ?? ''),
            );

            $sessions = new SessionService($pdo, new LoginValidator());
            $session = $sessions->startSession($user, [
                'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
                'user_agent' => $request->headers['user-agent'] ?? '',
            ]);

            Response::json([
                'success' => true,
                'message' => 'Login WhatsApp berhasil.',
                'data' => $session,
            ]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
                'code' => $exception->reasonCode,
            ], $exception->statusCode);
        }
    }
}
