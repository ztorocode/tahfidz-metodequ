<?php

declare(strict_types=1);

namespace App\Modules\Platform;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\RegisterRepository;
use App\Modules\Auth\RegistrationException;
use App\Modules\Auth\SessionService;

final class PlatformMusyrifController
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

    private function service(): PlatformMusyrifService
    {
        $pdo = Database::connection();
        return new PlatformMusyrifService($pdo, new RegisterRepository($pdo));
    }

    public function store(Request $request): never
    {
        try {
            $musyrif = $this->service()->createMusyrif($this->actor($request), $request->body());
            Response::json(['success' => true, 'message' => 'Musyrif platform berhasil ditambahkan.', 'data' => $musyrif], 201);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function inviteStore(Request $request): never
    {
        try {
            $result = $this->service()->createInvites($this->actor($request), $request->body());
            Response::json(['success' => true, 'message' => 'Undangan diproses.', 'data' => $result], 201);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function inviteIndex(Request $request): never
    {
        try {
            $list = $this->service()->listInvites($this->actor($request));
            Response::json(['success' => true, 'data' => $list]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function inviteRevoke(Request $request): never
    {
        try {
            $ok = $this->service()->revokeInvite($this->actor($request), (int) ($request->body()['id'] ?? 0));
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

    public function inviteRegenerate(Request $request): never
    {
        try {
            $link = $this->service()->regenerateInvite($this->actor($request), (int) ($request->body()['id'] ?? 0));
            Response::json(['success' => true, 'message' => 'Link undangan baru dibuat.', 'data' => $link]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function inviteStandingLink(Request $request): never
    {
        try {
            $link = $this->service()->standingLink($this->actor($request));
            Response::json(['success' => true, 'message' => 'Link undangan siap disalin.', 'data' => $link]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function inviteInfo(Request $request): never
    {
        try {
            $info = $this->service()->info(
                (string) ($request->query['token'] ?? ''),
                isset($request->query['email']) ? (string) $request->query['email'] : null
            );
            Response::json(['success' => true, 'data' => $info]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], $exception->statusCode);
        }
    }

    public function inviteAccept(Request $request): never
    {
        try {
            $body = $request->body();
            $actorId = null;
            if (isset($request->headers['authorization'])) {
                $pdo = Database::connection();
                $sessions = new SessionService($pdo, new LoginValidator());
                $me = $sessions->userFromToken(SessionService::bearerToken($request->headers));
                $actorId = $me !== null ? (int) $me['id'] : null;
            }
            $result = $this->service()->accept(
                (string) ($body['token'] ?? ''),
                (string) ($body['name'] ?? ''),
                (string) ($body['password'] ?? ''),
                isset($body['phone']) ? (string) $body['phone'] : null,
                isset($body['login_password']) ? (string) $body['login_password'] : null,
                $actorId,
                isset($body['email']) ? (string) $body['email'] : null,
            );

            $pdo = Database::connection();
            $sessions = new SessionService($pdo, new LoginValidator());
            $session = $sessions->startSession($result['user'], [
                'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
                'user_agent' => $request->headers['user-agent'] ?? '',
            ]);

            Response::json([
                'success' => true,
                'message' => 'Undangan diterima. Selamat bergabung sebagai Musyrif Platform!',
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
