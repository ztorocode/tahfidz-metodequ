<?php

declare(strict_types=1);

namespace App\Modules\Progress;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\StudentActivityLog;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\RegistrationException;
use App\Modules\Auth\SessionService;

final class ProgressController
{
    private function service(): ProgressService
    {
        return new ProgressService(Database::connection());
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

    /** Baca progress milik login ini. */
    public function index(Request $request): never
    {
        try {
            $pondokId = (int) ($request->query['pondok_id'] ?? 0);
            $week = (int) ($request->query['week'] ?? 1);
            $data = $this->service()->load($this->actor($request), $pondokId, $week);
            Response::json(['success' => true, 'data' => $data]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    /** Simpan satu hari (autosave dari perangkat, aman diulang). */
    public function save(Request $request): never
    {
        try {
            $row = $this->service()->save($this->actor($request), $request->body());
            $conflict = !empty($row['conflict']);
            Response::json([
                'success' => true,
                'message' => $conflict
                    ? 'Progress di perangkat lain lebih baru, data server dipertahankan.'
                    : 'Progress tersimpan.',
                'data' => $row,
            ]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    /** Musyrif mengisi murajaah, rabth awal/akhir, dan menghafal milik santri. */
    public function mentorSave(Request $request): never
    {
        try {
            $row = $this->service()->mentorSave($this->actor($request), $request->body());
            Response::json([
                'success' => true,
                'message' => 'Progress santri tersimpan.',
                'data' => $row,
            ]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    /** Baca progress seorang santri (musyrif/admin). */
    public function student(Request $request): never
    {
        try {
            $pondokId = (int) ($request->query['pondok_id'] ?? 0);
            $userId = (int) ($request->query['user_id'] ?? 0);
            $week = (int) ($request->query['week'] ?? 1);
            if ($userId < 1) {
                throw new RegistrationException('Santri wajib dipilih.', 422, ['user_id' => 'Santri wajib dipilih.']);
            }
            $data = $this->service()->forStudent($this->actor($request), $pondokId, $userId, $week);
            Response::json(['success' => true, 'data' => $data]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }
    /** Catat aksi belajar santri (hafalan kemarin, istima, menghafal, merekam, tikrar). */
    public function activity(Request $request): never
    {
        try {
            $actor = $this->actor($request);
            $logger = new StudentActivityLog(Database::connection());
            $row = $logger->log((int) $actor['id'], $request->body());
            Response::json(['success' => true, 'message' => 'Aktivitas tercatat.', 'data' => $row], 201);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

}
