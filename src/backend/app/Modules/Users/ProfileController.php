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

    public function search(Request $request): never
    {
        try {
            $pdo = Database::connection();
            $sessions = new SessionService($pdo, new LoginValidator());
            $me = $sessions->userFromToken(SessionService::bearerToken($request->headers));

            if ($me === null) {
                Response::json(['success' => false, 'message' => 'Sesi tidak valid atau sudah berakhir.'], 401);
            }

            $actor = ['id' => $me['id'], 'roles' => $me['roles'] ?? []];
            $pondokId = (int) ($request->query['pondok_id'] ?? 0);
            \App\Modules\Musyrifs\PondokAccess::assertPondokAdmin($pdo, $actor, $pondokId);

            $q = trim((string) ($request->query['q'] ?? ''));
            if (mb_strlen($q) < 2) {
                Response::json(['success' => true, 'data' => []]);
            }

            $like = '%' . $q . '%';
            $statement = $pdo->prepare(
                'SELECT u.id, u.name, u.email, u.phone_e164,
                        (SELECT m.role FROM pondok_memberships m
                         WHERE m.user_id = u.id AND m.pondok_id = :pondok_id AND m.status = \'active\' LIMIT 1) AS pondok_role
                 FROM users u
                 WHERE (u.email LIKE :q1 OR u.name LIKE :q2 OR u.phone_e164 LIKE :q3)
                 ORDER BY u.name LIMIT 10'
            );
            $statement->execute(['pondok_id' => $pondokId, 'q1' => $like, 'q2' => $like, 'q3' => $like]);
            $rows = $statement->fetchAll(\PDO::FETCH_ASSOC);

            Response::json(['success' => true, 'data' => array_map(static fn(array $row) => [
                'id' => (int) $row['id'],
                'name' => $row['name'],
                'email' => $row['email'],
                'phone' => $row['phone_e164'],
                'pondok_role' => $row['pondok_role'],
            ], $rows)]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], $exception->statusCode);
        }
    }
}
