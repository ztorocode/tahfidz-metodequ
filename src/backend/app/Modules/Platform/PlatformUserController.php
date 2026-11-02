<?php

declare(strict_types=1);

namespace App\Modules\Platform;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\SessionService;
use InvalidArgumentException;

final class PlatformUserController
{
    public function update(Request $request): never
    {
        header('Cache-Control: private, no-store');
        $pdo = Database::connection();
        $sessions = new SessionService($pdo, new LoginValidator());
        $actor = $sessions->userFromToken(SessionService::bearerToken($request->headers));
        if ($actor === null) {
            Response::json(['success' => false, 'message' => 'Sesi tidak valid atau sudah berakhir.'], 401);
        }
        if (!in_array('super_admin', $actor['roles'] ?? [], true)) {
            Response::json(['success' => false, 'message' => 'Hanya Super Admin yang boleh mengubah pengguna.'], 403);
        }
        $input = $request->body();
        $userId = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($userId === false || $userId === null) {
            Response::json(['success' => false, 'message' => 'ID pengguna tidak valid.'], 422);
        }

        try {
            $result = (new PlatformUserService($pdo))->update((int) $userId, (int) $actor['id'], $input);
            $message = 'Perubahan pengguna disimpan.';
            if ($result['email_changed']) {
                $message .= $result['email_sent']
                    ? ' Email baru perlu diverifikasi melalui tautan yang sudah dikirim.'
                    : ' Email baru perlu diverifikasi. Pengiriman email gagal; gunakan fitur kirim ulang verifikasi.';
            }
            Response::json([
                'success' => true,
                'message' => $message,
                'data' => $result,
            ]);
        } catch (\App\Modules\Auth\RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function index(Request $request): never
    {
        header('Cache-Control: private, no-store');

        $pdo = Database::connection();
        $sessions = new SessionService($pdo, new LoginValidator());
        $actor = $sessions->userFromToken(SessionService::bearerToken($request->headers));
        if ($actor === null) {
            Response::json(['success' => false, 'message' => 'Sesi tidak valid atau sudah berakhir.'], 401);
        }
        if (!in_array('super_admin', $actor['roles'] ?? [], true)) {
            Response::json(['success' => false, 'message' => 'Hanya Super Admin yang dapat melihat semua pengguna.'], 403);
        }

        try {
            $data = (new PlatformUserService($pdo))->index($request->query);
            Response::json(['success' => true, 'data' => $data]);
        } catch (InvalidArgumentException $exception) {
            Response::json(['success' => false, 'message' => $exception->getMessage()], 422);
        }
    }
}
