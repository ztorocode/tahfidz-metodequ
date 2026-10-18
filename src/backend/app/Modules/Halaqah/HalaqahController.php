<?php

declare(strict_types=1);

namespace App\Modules\Halaqah;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\RegistrationException;
use App\Modules\Auth\SessionService;

final class HalaqahController
{
    private function service(): HalaqahService
    {
        return new HalaqahService(Database::connection());
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

    public function index(Request $request): never
    {
        try {
            $pondokId = (int) ($request->query['pondok_id'] ?? 0);
            if ($pondokId < 1) {
                throw new RegistrationException('Pondok wajib dipilih.', 422, ['pondok_id' => 'Pondok wajib dipilih.']);
            }
            $list = $this->service()->list($this->actor($request), $pondokId);
            Response::json(['success' => true, 'data' => $list]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    /** Halaqah milik login ini (santri binaan / musyrif pengampu). */
    public function mine(Request $request): never
    {
        try {
            $pondokId = (int) ($request->query['pondok_id'] ?? 0);
            if ($pondokId < 1) {
                throw new RegistrationException('Pondok wajib dipilih.', 422, ['pondok_id' => 'Pondok wajib dipilih.']);
            }
            $data = $this->service()->mine($this->actor($request), $pondokId);
            Response::json(['success' => true, 'data' => $data]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    /** Atur tanggal mulai program halaqah (Hari ke-1). */
    public function startDate(Request $request): never
    {
        try {
            $result = $this->service()->setStartDate($this->actor($request), $request->body());
            Response::json([
                'success' => true,
                'message' => $result['program_start_date'] !== null
                    ? 'Tanggal mulai program disimpan.'
                    : 'Tanggal mulai program dihapus.',
                'data' => $result,
            ]);
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
            $halaqah = $this->service()->create($this->actor($request), $request->body());
            Response::json(['success' => true, 'message' => 'Halaqah dibuat.', 'data' => $halaqah], 201);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function members(Request $request): never
    {
        try {
            $result = $this->service()->setMembers($this->actor($request), $request->body());
            Response::json(['success' => true, 'message' => 'Santri halaqah diperbarui.', 'data' => $result]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }
}
