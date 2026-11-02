<?php

declare(strict_types=1);

namespace App\Modules\Users;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\SessionService;

final class StudentEnrollmentController
{
    public function show(Request $request): never
    {
        header('Cache-Control: private, no-store');

        $pdo = Database::connection();
        $auth = new SessionService($pdo, new LoginValidator());
        $actor = $auth->userFromToken(SessionService::bearerToken($request->headers));
        if ($actor === null) {
            Response::json(['success' => false, 'message' => 'Silakan login kembali.'], 401);
        }
        if (!in_array('member', $actor['roles'] ?? [], true)) {
            Response::json(['success' => false, 'message' => 'Hanya Santri yang dapat mengakses status ini.'], 403);
        }

        $email = (string) ($actor['email'] ?? '');
        $data = (new StudentEnrollmentService($pdo))->forStudent((int) $actor['id'], $email);
        Response::json(['success' => true, 'data' => $data]);
    }
}
