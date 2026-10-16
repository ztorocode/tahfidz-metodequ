<?php

declare(strict_types=1);

namespace App\Modules\Musyrifs;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\RegistrationException;
use App\Modules\Auth\SessionService;

final class PondokMemberController
{
    private function service(): PondokMemberService
    {
        return new PondokMemberService(Database::connection());
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

    public function pending(Request $request): never
    {
        try {
            $list = $this->service()->listPending(
                $this->actor($request),
                (int) ($request->query['pondok_id'] ?? 0),
                (string) ($request->query['role'] ?? '')
            );
            Response::json(['success' => true, 'data' => $list]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function approve(Request $request): never
    {
        try {
            $row = $this->service()->approve($this->actor($request), (int) ($request->body()['id'] ?? 0));
            Response::json(['success' => true, 'message' => $row['name'] . ' disetujui. Selamat bergabung!', 'data' => $row]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function reject(Request $request): never
    {
        try {
            $row = $this->service()->reject($this->actor($request), (int) ($request->body()['id'] ?? 0));
            Response::json(['success' => true, 'message' => 'Pengajuan ' . $row['name'] . ' ditolak.', 'data' => $row]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }
}
