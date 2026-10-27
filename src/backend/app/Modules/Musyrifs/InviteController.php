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
            $actor = $this->actor($request);
            $body = $request->body();
            $emails = $body['emails'] ?? null;
            if (is_array($emails)) {
                $result = $this->service()->createBulk($actor, [
                    'pondok_id' => $body['pondok_id'] ?? 0,
                    'role' => $body['role'] ?? 'musyrif',
                    'emails' => $emails,
                ]);
                $sent = count($result['sent']);
                $failed = count($result['failed']);
                $message = $failed === 0
                    ? $sent . ' undangan terkirim.'
                    : $sent . ' terkirim, ' . $failed . ' gagal.';
                Response::json(['success' => $failed === 0, 'message' => $message, 'data' => $result], $failed === 0 ? 201 : 207);
            }
            $invite = $this->service()->create($actor, $body);
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

    public function regenerate(Request $request): never    {
        try {
            $invite = $this->service()->regenerateLink($this->actor($request), (int) ($request->body()['id'] ?? 0));
            Response::json(['success' => true, 'message' => 'Link undangan baru dibuat.', 'data' => $invite]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function standingLink(Request $request): never
    {
        try {
            $body = $request->body();
            $link = $this->service()->standingLink(
                $this->actor($request),
                (int) ($body['pondok_id'] ?? 0),
                (string) ($body['role'] ?? '')
            );
            Response::json(['success' => true, 'message' => 'Link undangan siap disalin.', 'data' => $link]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function mine(Request $request): never
    {
        $me = $this->actor($request);
        $pdo = Database::connection();
        $email = (string) $pdo->query(
            'SELECT email FROM users WHERE id = ' . (int) $me['id']
        )->fetchColumn();
        $list = $this->service()->mine($email);
        Response::json(['success' => true, 'data' => $list]);
    }

    public function acceptMine(Request $request): never
    {
        try {
            $me = $this->actor($request);
            $result = $this->service()->acceptById($me['id'], (int) ($request->body()['id'] ?? 0));

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
            ]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], $exception->statusCode);
        }
    }

    public function info(Request $request): never
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

    public function accept(Request $request): never
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
                'message' => ($result['membership_status'] ?? 'active') === 'invited'
                    ? 'Pendaftaran terkirim. Menunggu persetujuan admin pondok.'
                    : 'Undangan diterima. Selamat bergabung!',
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
