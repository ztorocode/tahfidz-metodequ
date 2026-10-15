<?php

declare(strict_types=1);

namespace App\Modules\Users;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\RegistrationException;
use App\Modules\Auth\SessionService;

final class ProfileController
{
    /** @return array{id:int} */
    private function actor(Request $request): array
    {
        $pdo = Database::connection();
        $sessions = new SessionService($pdo, new LoginValidator());
        $user = $sessions->userFromToken(SessionService::bearerToken($request->headers));

        if ($user === null) {
            Response::json(['success' => false, 'message' => 'Sesi tidak valid atau sudah berakhir.'], 401);
        }

        return ['id' => $user['id']];
    }

    public function show(Request $request): never
    {
        $pdo = Database::connection();
        $sessions = new SessionService($pdo, new LoginValidator());
        $user = $sessions->userFromToken(SessionService::bearerToken($request->headers));

        if ($user === null) {
            Response::json(['success' => false, 'message' => 'Sesi tidak valid atau sudah berakhir.'], 401);
        }

        Response::json(['success' => true, 'data' => ['user' => $user]]);
    }

    public function update(Request $request): never
    {
        try {
            $actor = $this->actor($request);
            $service = new ProfileService(Database::connection());
            $user = $service->update($actor['id'], $request->body());
            Response::json(['success' => true, 'message' => 'Profil diperbarui.', 'data' => ['user' => $user]]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function password(Request $request): never
    {
        try {
            $actor = $this->actor($request);
            $body = $request->body();
            $service = new ProfileService(Database::connection());
            $service->changePassword(
                $actor['id'],
                (string) ($body['current_password'] ?? ''),
                (string) ($body['password'] ?? $body['new_password'] ?? ''),
            );
            Response::json(['success' => true, 'message' => 'Password diganti. Silakan login ulang.']);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }
}
