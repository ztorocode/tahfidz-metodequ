<?php

declare(strict_types=1);

namespace App\Modules\Whatsapp;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\WaGateway;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\RegistrationException;
use App\Modules\Auth\SessionService;
use App\Modules\Musyrifs\PondokAccess;
use PDO;

final class WaController
{
    private WaGateway $gateway;

    public function __construct()
    {
        $this->gateway = WaGateway::fromEnv();
    }

    /**
     * Wajib login (cek akses admin pondok dilakukan per-aksi).
     *
     * @return array{id:int,roles:string[]}
     */
    private function actor(Request $request): array
    {
        $sessions = new SessionService(Database::connection(), new LoginValidator());
        $user = $sessions->userFromToken(SessionService::bearerToken($request->headers));

        if ($user === null) {
            Response::json(['success' => false, 'message' => 'Sesi tidak valid atau sudah berakhir.'], 401);
        }

        return ['id' => $user['id'], 'roles' => $user['roles'] ?? []];
    }

    /** @return array{pondok_id:int,pondok_name:string,pondok_slug:string,device_id:string|null} */
    private function context(Request $request, bool $fromQuery): array
    {
        $pondokId = (int) ($fromQuery ? ($request->query['pondok_id'] ?? 0) : ($request->body()['pondok_id'] ?? 0));
        if ($pondokId < 1) {
            throw new RegistrationException('pondok_id wajib diisi.', 422, ['pondok_id' => 'pondok_id wajib diisi.']);
        }

        $pdo = Database::connection();
        PondokAccess::assertPondokAdmin($pdo, $this->actor($request), $pondokId);

        $statement = $pdo->prepare('SELECT name, slug FROM pondoks WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $statement->execute(['id' => $pondokId]);
        $pondok = $statement->fetch(PDO::FETCH_ASSOC);
        if (!is_array($pondok)) {
            throw new RegistrationException('Pondok tidak ditemukan.', 404, ['pondok_id' => 'Pondok tidak ditemukan.']);
        }

        $device = $pdo->prepare('SELECT device_id FROM pondok_wa_devices WHERE pondok_id = :id LIMIT 1');
        $device->execute(['id' => $pondokId]);
        $deviceId = $device->fetchColumn();

        return [
            'pondok_id' => $pondokId,
            'pondok_name' => (string) $pondok['name'],
            'pondok_slug' => (string) $pondok['slug'],
            'device_id' => $deviceId === false ? null : (string) $deviceId,
        ];
    }

    public function status(Request $request): never
    {
        try {
            $context = $this->context($request, fromQuery: true);
            if ($context['device_id'] === null) {
                Response::json(['success' => true, 'data' => [
                    'has_device' => false,
                    'device_id' => null,
                    'is_connected' => false,
                    'is_logged_in' => false,
                    'jid' => '',
                ]]);
            }

            $status = $this->gateway->status($context['device_id']);
            Response::json(['success' => true, 'data' => ['has_device' => true] + $status]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        } catch (\RuntimeException $exception) {
            Response::json(['success' => false, 'message' => $exception->getMessage()], 400);
        }
    }

    /** Buat slot device pondok: nama device = slug pondok. */
    public function device(Request $request): never
    {
        try {
            $pdo = Database::connection();
            $context = $this->context($request, fromQuery: false);

            if ($context['device_id'] !== null) {
                Response::json(['success' => true, 'message' => 'Device sudah ada.', 'data' => [
                    'has_device' => true,
                    'device_id' => $context['device_id'],
                    'created' => false,
                ]]);
            }

            $deviceId = $this->uniqueDeviceId($pdo, $context['pondok_slug'], $context['pondok_id']);

            try {
                $this->gateway->createDevice($deviceId);
            } catch (\RuntimeException $exception) {
                if (!preg_match('/exist|sudah|already/i', $exception->getMessage())) {
                    throw $exception;
                }
            }

            $statement = $pdo->prepare(
                'INSERT INTO pondok_wa_devices (pondok_id, device_id) VALUES (:pondok_id, :device_id)
                 ON DUPLICATE KEY UPDATE device_id = VALUES(device_id)'
            );
            $statement->execute(['pondok_id' => $context['pondok_id'], 'device_id' => $deviceId]);

            Response::json(['success' => true, 'message' => 'Device dibuat.', 'data' => [
                'has_device' => true,
                'device_id' => $deviceId,
                'created' => true,
            ]]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        } catch (\RuntimeException $exception) {
            Response::json(['success' => false, 'message' => $exception->getMessage()], 400);
        }
    }

    public function qr(Request $request): never
    {
        try {
            $context = $this->context($request, fromQuery: false);
            if ($context['device_id'] === null) {
                throw new RegistrationException('Buat device pondok dulu sebelum memindai QR.', 422, ['device' => 'Buat device dulu.']);
            }

            Response::json(['success' => true, 'data' => $this->gateway->qr($context['device_id'])]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        } catch (\RuntimeException $exception) {
            Response::json(['success' => false, 'message' => $exception->getMessage()], 400);
        }
    }

    public function logout(Request $request): never
    {
        try {
            $context = $this->context($request, fromQuery: false);
            if ($context['device_id'] === null) {
                throw new RegistrationException('Belum ada device untuk pondok ini.', 422, ['device' => 'Buat device dulu.']);
            }

            $this->gateway->logout($context['device_id']);
            Response::json(['success' => true, 'message' => 'Perangkat diputus.']);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        } catch (\RuntimeException $exception) {
            Response::json(['success' => false, 'message' => $exception->getMessage()], 400);
        }
    }

    public function reconnect(Request $request): never
    {
        try {
            $context = $this->context($request, fromQuery: false);
            if ($context['device_id'] === null) {
                throw new RegistrationException('Belum ada device untuk pondok ini.', 422, ['device' => 'Buat device dulu.']);
            }

            $this->gateway->reconnect($context['device_id']);
            Response::json(['success' => true, 'message' => 'Mencoba menyambungkan ulang.']);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        } catch (\RuntimeException $exception) {
            Response::json(['success' => false, 'message' => $exception->getMessage()], 400);
        }
    }

    /** Device id = slug pondok, diberi suffix id bila bentrok. */
    private function uniqueDeviceId(PDO $pdo, string $slug, int $pondokId): string
    {
        $base = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $slug) ?? '');
        $base = trim($base, '-') ?: 'pondok-' . $pondokId;

        $candidate = $base;
        $statement = $pdo->prepare('SELECT COUNT(*) FROM pondok_wa_devices WHERE device_id = :device_id');
        $statement->execute(['device_id' => $candidate]);
        if ((int) $statement->fetchColumn() > 0) {
            $candidate = $base . '-' . $pondokId;
            $statement->execute(['device_id' => $candidate]);
            if ((int) $statement->fetchColumn() > 0) {
                $candidate = $base . '-' . $pondokId . '-' . time();
            }
        }

        return substr($candidate, 0, 120);
    }
}
