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

final class SantriController
{
    private function service(): SantriService
    {
        $pdo = Database::connection();
        return new SantriService($pdo, new RegisterRepository($pdo), new SantriValidator());
    }
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

    public function store(Request $request): never
    {
        try {
            $santri = $this->service()->addPondokSantri($this->actor($request), $request->body());
            Response::json(['success' => true, 'message' => 'Santri berhasil ditambahkan.', 'data' => $santri], 201);
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
            $pdo = Database::connection();
            $actor = $this->actor($request);
            $pondokId = (int) ($request->query['pondok_id'] ?? 0);
            PondokAccess::assertPondokAdmin($pdo, $actor, $pondokId);

            $statement = $pdo->prepare(
                "SELECT u.id, u.name, u.username, u.email, u.phone_e164, u.email_verified_at, u.status
                 FROM pondok_memberships m
                 JOIN users u ON u.id = m.user_id
                 WHERE m.pondok_id = :pondok_id AND m.role = 'santri' AND m.status = 'active'
                 ORDER BY u.name"
            );
            $statement->execute(['pondok_id' => $pondokId]);
            $rows = $statement->fetchAll(\PDO::FETCH_ASSOC);

            $list = array_map(static fn(array $row) => [
                'id' => (int) $row['id'],
                'name' => $row['name'],
                'username' => $row['username'],
                'email' => $row['email'],
                'phone' => $row['phone_e164'],
                'email_verified' => $row['email_verified_at'] !== null,
                'status' => $row['status'],
            ], $rows);

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
