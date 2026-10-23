<?php

declare(strict_types=1);

namespace App\Modules\Setoran;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\RegistrationException;
use App\Modules\Auth\SessionService;

final class SetoranController
{
    private function service(): SetoranService
    {
        return new SetoranService(Database::connection());
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

        return ['id' => (int) $user['id'], 'roles' => $user['roles'] ?? []];
    }

    /** Riwayat penilaian setoran seorang santri. */
    public function index(Request $request): never
    {
        try {
            $pondokId = (int) ($request->query['pondok_id'] ?? 0);
            $userId = (int) ($request->query['user_id'] ?? 0);
            $data = $this->service()->list($this->actor($request), $pondokId, $userId);
            Response::json(['success' => true, 'data' => $data]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    /** Catat satu penilaian setoran (musyrif halaqah santri itu). */
    public function store(Request $request): never
    {
        try {
            $row = $this->service()->create($this->actor($request), $request->body());
            Response::json(['success' => true, 'message' => 'Penilaian setoran tersimpan.', 'data' => $row]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    /** Hapus penilaian yang keliru (hanya penilai awal). */
    public function remove(Request $request): never
    {
        try {
            $body = $request->body();
            $id = (int) ($body['id'] ?? 0);
            if ($id < 1) {
                throw new RegistrationException('Penilaian tidak dipilih.', 422, ['id' => 'Penilaian tidak dipilih.']);
            }
            $data = $this->service()->remove($this->actor($request), $id);
            Response::json(['success' => true, 'message' => 'Penilaian setoran dihapus.', 'data' => $data]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }
}
