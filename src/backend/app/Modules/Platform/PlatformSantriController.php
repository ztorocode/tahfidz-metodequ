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

final class PlatformSantriController
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

    private function service(): PlatformSantriService
    {
        $pdo = Database::connection();
        return new PlatformSantriService($pdo, new RegisterRepository($pdo));
    }

    public function inviteStore(Request $request): never
    {
        try {
            $result = $this->service()->createInvites($this->actor($request), $request->body());
            $failed = count($result['failed']);
            Response::json([
                'success' => $failed === 0,
                'message' => $failed === 0 ? 'Undangan terkirim.' : 'Sebagian undangan gagal.',
                'data' => $result,
            ], $failed === 0 ? 201 : 207);
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
            $body = $request->body();
            $result = $this->service()->standingLink(
                $this->actor($request),
                (int) ($body['halaqah_id'] ?? 0)
            );
            Response::json(['success' => true, 'message' => 'Link undangan siap disalin.', 'data' => $result]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function store(Request $request): never
    {
        try {
            $result = $this->service()->addDirect($this->actor($request), $request->body());
            Response::json(['success' => true, 'message' => 'Santri berhasil ditambahkan.', 'data' => $result], 201);
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
            $result = $this->service()->info((string) ($request->query['token'] ?? ''));
            Response::json(['success' => true, 'data' => $result]);
        } catch (RegistrationException $exception) {
            Response::json(['success' => false, 'message' => $exception->getMessage()], $exception->statusCode);
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
                'message' => 'Undangan diterima. Anda sudah masuk ke halaqah.',
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
