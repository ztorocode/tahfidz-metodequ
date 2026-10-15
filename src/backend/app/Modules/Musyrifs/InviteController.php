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

final class InviteController
{
    private function service(): InviteService
    {
        $pdo = Database::connection();
        return new InviteService($pdo, new RegisterRepository($pdo));
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
            $invite = $this->service()->create($this->actor($request), $request->body());
            Response::json(['success' => true, 'message' => 'Undangan terkirim.', 'data' => $invite], 201);
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
            $actor = $this->actor($request);
            $pondokId = (int) ($request->query['pondok_id'] ?? 0);
            $role = (string) ($request->query['role'] ?? '');
            PondokAccess::assertPondokAdmin(Database::connection(), $actor, $pondokId);
            $list = $this->service()->list($actor, $pondokId, $role);
            Response::json(['success' => true, 'data' => $list]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function revoke(Request $request): never
    {
        try {
            $ok = $this->service()->revoke($this->actor($request), (int) ($request->body()['id'] ?? 0));
            Response::json(
                ['success' => $ok, 'message' => $ok ? 'Undangan dibatalkan.' : 'Undangan tidak ditemukan.'],
                $ok ? 200 : 404
            );
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function info(Request $request): never
    {
        try {
            $info = $this->service()->info((string) ($request->query['token'] ?? ''));
            Response::json(['success' => true, 'data' => $info]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], $exception->statusCode);
        }
    }

    public function accept(Request $request): never
    {
        try {
            $body = $request->body();
            $result = $this->service()->accept(
                (string) ($body['token'] ?? ''),
                (string) ($body['name'] ?? ''),
                (string) ($body['password'] ?? ''),
                isset($body['phone']) ? (string) $body['phone'] : null,
            );

            $pdo = Database::connection();
            $sessions = new SessionService($pdo, new LoginValidator());
            $session = $sessions->startSession($result['user'], [
                'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
                'user_agent' => $request->headers['user-agent'] ?? '',
            ]);

            Response::json([
                'success' => true,
                'message' => 'Undangan diterima. Selamat bergabung!',
                'data' => $session,
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
