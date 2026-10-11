<?php

declare(strict_types=1);

namespace App\Modules\Auth;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;

final class SessionController
{
    public function me(Request $request): never
    {
        $pdo = Database::connection();
        $service = new SessionService($pdo, new LoginValidator());
        $user = $service->userFromToken(SessionService::bearerToken($request->headers));

        if ($user === null) {
            Response::json(['success' => false, 'message' => 'Sesi tidak valid atau sudah berakhir.'], 401);
        }

        Response::json(['success' => true, 'data' => ['user' => $user]]);
    }

    public function logout(Request $request): never
    {
        $pdo = Database::connection();
        $service = new SessionService($pdo, new LoginValidator());
        $revoked = $service->logout(SessionService::bearerToken($request->headers));

        Response::json([
            'success' => $revoked,
            'message' => $revoked ? 'Logout berhasil.' : 'Sesi tidak ditemukan.',
        ], $revoked ? 200 : 404);
    }
}
