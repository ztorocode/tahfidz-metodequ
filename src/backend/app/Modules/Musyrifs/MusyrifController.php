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
use PDO;

final class MusyrifController
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

    private function service(): MusyrifService
    {
        $pdo = Database::connection();
        return new MusyrifService($pdo, new RegisterRepository($pdo), new MusyrifValidator());
    }

    public function store(Request $request): never
    {
        try {
            $musyrif = $this->service()->addPondokMusyrif($this->actor($request), $request->body());
            Response::json(['success' => true, 'message' => 'Musyrif berhasil ditambahkan.', 'data' => $musyrif], 201);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function attach(Request $request): never
    {
        try {
            $pdo = Database::connection();
            $service = new MusyrifService($pdo, new RegisterRepository($pdo), new MusyrifValidator());
            $body = $request->body();
            $musyrif = $service->attachExisting(
                $this->actor($request),
                (int) ($body['pondok_id'] ?? 0),
                (int) ($body['user_id'] ?? 0)
            );
            Response::json(['success' => true, 'message' => 'Musyrif berhasil ditambahkan.', 'data' => $musyrif], 201);
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
            $pondokId = (int) ($request->query['pondok_id'] ?? 0);
            $list = $this->service()->listPondokMusyrifs($this->actor($request), $pondokId);
            Response::json(['success' => true, 'data' => $list]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    /**
     * Daftar musyrif lintas platform (super admin): tipe platform/pondok,
     * jumlah dampingan aktif, dan status — untuk #platform-musyrif.
     */
    public function platformIndex(Request $request): never
    {
        $actor = $this->actor($request);
        if (!in_array('super_admin', $actor['roles'], true)) {
            Response::json(['success' => false, 'message' => 'Hanya super admin yang boleh mengakses.'], 403);
        }

        $pdo = Database::connection();
        $rows = $pdo->query(
            'SELECT mp.id, mp.type, mp.status, u.name, u.email, p.name AS pondok_name,
                    (SELECT COUNT(*) FROM musyrif_mentees mm
                      WHERE mm.musyrif_profile_id = mp.id AND mm.status = "active") AS dampingan
             FROM musyrif_profiles mp
             JOIN users u ON u.id = mp.user_id AND u.deleted_at IS NULL
             LEFT JOIN pondoks p ON p.id = mp.pondok_id
             ORDER BY mp.type = "platform" DESC, u.name ASC'
        )->fetchAll(PDO::FETCH_ASSOC);

        $items = array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'email' => (string) $row['email'],
            'type' => (string) $row['type'],
            'scope' => $row['type'] === 'platform' ? 'MetodeQu' : (string) ($row['pondok_name'] ?? '-'),
            'dampingan' => (int) $row['dampingan'],
            'status' => (string) $row['status'],
        ], $rows);

        $activePlatform = 0;
        $activePondok = 0;
        foreach ($items as $item) {
            if ($item['status'] !== 'active') {
                continue;
            }
            if ($item['type'] === 'platform') {
                $activePlatform++;
            } else {
                $activePondok++;
            }
        }

        Response::json(['success' => true, 'data' => [
            'items' => $items,
            'total' => count($items),
            'platform_active' => $activePlatform,
            'pondok_active' => $activePondok,
            'dampingan_total' => array_sum(array_column($items, 'dampingan')),
        ]]);
    }
}
