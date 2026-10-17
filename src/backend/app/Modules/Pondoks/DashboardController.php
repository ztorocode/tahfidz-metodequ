<?php

declare(strict_types=1);

namespace App\Modules\Pondoks;

use App\Core\Database;
use App\Core\PondokDashboard;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\RegistrationException;
use App\Modules\Auth\SessionService;
use App\Modules\Musyrifs\PondokAccess;

final class DashboardController
{
    /** Ringkasan dashboard siap pakai (baca tabel pondok_dashboard, auto-refresh bila basi). */
    public function summary(Request $request): never
    {
        try {
            $pdo = Database::connection();
            $sessions = new SessionService($pdo, new LoginValidator());
            $user = $sessions->userFromToken(SessionService::bearerToken($request->headers));
            if ($user === null) {
                Response::json(['success' => false, 'message' => 'Sesi tidak valid atau sudah berakhir.'], 401);
            }

            $pondokId = (int) ($request->query['pondok_id'] ?? 0);
            if ($pondokId < 1) {
                throw new RegistrationException('Pondok wajib dipilih.', 422, ['pondok_id' => 'Pondok wajib dipilih.']);
            }

            PondokAccess::assertPondokAdmin($pdo, [
                'id' => $user['id'],
                'roles' => $user['roles'] ?? [],
            ], $pondokId);

            $force = ($request->query['refresh'] ?? '') === '1';
            $summary = PondokDashboard::summary($pdo, $pondokId, $force);

            Response::json(['success' => true, 'data' => $summary]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }
}
