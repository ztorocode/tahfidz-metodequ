<?php

declare(strict_types=1);

namespace App\Modules\Musyrifs;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\RegisterRepository;
use App\Modules\Auth\RegistrationException;
use App\Modules\Auth\SessionService;

final class MusyrifController
{
    /** @return array{id:int,roles:string[]} */
    private function actor(Request $request): array
    {
        $pdo = Database::connection();
        $sessions = new SessionService($pdo, new LoginValidator());
        $user = $sessions->userFromToken(SessionService::bearerToken($request->headers));

        if ($user === null) {
            Response::json(['success' => false, 'message' => 'Sesi tidak valid atau sudah berakhir.'], 401);
        }

        return ['id' => $user['id'], 'roles' => $user['roles'] ?? []];
    }

    private function service(): MusyrifService
    {
        $pdo = Database::connection();
        return new MusyrifService($pdo, new RegisterRepository($pdo), new MusyrifValidator());
    }

    public function store(Request $request): never
    {
        try {
            $musyrif = $this->service()->addPondokMusyrif($this->actor($request), $request->body());
            Response::json(['success' => true, 'message' => 'Musyrif berhasil ditambahkan.', 'data' => $musyrif], 201);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function index(Request $request): never
    {
        try {
            $pondokId = (int) ($request->query['pondok_id'] ?? 0);
            $list = $this->service()->listPondokMusyrifs($this->actor($request), $pondokId);
            Response::json(['success' => true, 'data' => $list]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }
}
