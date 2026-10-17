<?php

declare(strict_types=1);

namespace App\Modules\Whatsapp;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\WaGateway;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\SessionService;

final class WaController
{
    private WaGateway $gateway;

    public function __construct()
    {
        $this->gateway = WaGateway::fromEnv();
    }

    /**
     * Wajib login sebagai admin pondok (atau super admin).
     *
     * @return array{id:int,roles:string[]}
     */
    private function adminActor(Request $request): array
    {
        $pdo = Database::connection();
        $sessions = new SessionService($pdo, new LoginValidator());
        $user = $sessions->userFromToken(SessionService::bearerToken($request->headers));

        if ($user === null) {
            Response::json(['success' => false, 'message' => 'Sesi tidak valid atau sudah berakhir.'], 401);
        }

        $roles = $user['roles'] ?? [];
        if (!in_array('admin', $roles, true) && !in_array('super_admin', $roles, true)) {
            Response::json(['success' => false, 'message' => 'Hanya admin yang boleh mengelola perangkat WhatsApp.'], 403);
        }

        return ['id' => $user['id'], 'roles' => $roles];
    }

    public function status(Request $request): never
    {
        try {
            $this->adminActor($request);
            Response::json(['success' => true, 'data' => $this->gateway->status()]);
        } catch (\RuntimeException $exception) {
            Response::json(['success' => false, 'message' => $exception->getMessage()], 400);
        }
    }

    public function qr(Request $request): never
    {
        try {
            $this->adminActor($request);
            Response::json(['success' => true, 'data' => $this->gateway->qr()]);
        } catch (\RuntimeException $exception) {
            Response::json(['success' => false, 'message' => $exception->getMessage()], 400);
        }
    }

    public function logout(Request $request): never
    {
        try {
            $this->adminActor($request);
            Response::json(['success' => true, 'message' => 'Perangkat diputus.', 'data' => $this->gateway->logout()]);
        } catch (\RuntimeException $exception) {
            Response::json(['success' => false, 'message' => $exception->getMessage()], 400);
        }
    }

    public function reconnect(Request $request): never
    {
        try {
            $this->adminActor($request);
            Response::json(['success' => true, 'message' => 'Mencoba menyambungkan ulang.', 'data' => $this->gateway->reconnect()]);
        } catch (\RuntimeException $exception) {
            Response::json(['success' => false, 'message' => $exception->getMessage()], 400);
        }
    }
}
