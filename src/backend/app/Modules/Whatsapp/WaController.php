<?php

declare(strict_types=1);

namespace App\Modules\Whatsapp;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Core\WaGateway;
use App\Core\WaSender;
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

    public function history(Request $request): never
    {
        try {
            $context = $this->context($request, fromQuery: true);

            $statement = Database::connection()->prepare(
                'SELECT o.id, o.type, o.recipient_phone_e164, o.status, o.last_error, o.created_at, o.sent_at,
                        u.name AS recipient_name
                 FROM whatsapp_outbox o
                 LEFT JOIN users u ON u.id = o.user_id
                 WHERE o.pondok_id = :pondok_id
                 ORDER BY o.id DESC
                 LIMIT 50'
            );
            $statement->execute(['pondok_id' => $context['pondok_id']]);

            $items = array_map(static function (array $row): array {
                $phone = (string) $row['recipient_phone_e164'];
                return [
                    'id' => (int) $row['id'],
                    'type' => (string) $row['type'],
                    'recipient' => $row['recipient_name'] !== null && $row['recipient_name'] !== ''
                        ? (string) $row['recipient_name']
                        : $phone,
                    'phone' => $phone,
                    'status' => (string) $row['status'],
                    'error' => $row['last_error'] !== null ? (string) $row['last_error'] : null,
                    'time' => (string) $row['created_at'],
                    'sent_at' => $row['sent_at'] !== null ? (string) $row['sent_at'] : null,
                ];
            }, $statement->fetchAll(PDO::FETCH_ASSOC));

            Response::json(['success' => true, 'data' => [
                'items' => $items,
                'device_id' => $context['device_id'],
                'has_device' => $context['device_id'] !== null,
            ]]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    /** Kirim 1 pesan beneran dari device pondok (uji koneksi). */
    public function testSend(Request $request): never
    {
        try {
            $body = $request->body();
            $context = $this->context($request, fromQuery: false);
            if ($context['device_id'] === null) {
                throw new RegistrationException('Buat device pondok dulu.', 422, ['device' => 'Buat device dulu.']);
            }

            $phone = '+' . ltrim(preg_replace('/\D+/', '', (string) ($body['phone'] ?? '')) ?? '', '+');
            if (strlen(preg_replace('/\D+/', '', $phone) ?? '') < 8) {
                throw new RegistrationException('Nomor WhatsApp tidak valid.', 422, ['phone' => 'Nomor WhatsApp tidak valid.']);
            }

            $message = trim((string) ($body['message'] ?? ''));
            if ($message === '') {
                $message = 'Test dari ' . $context['pondok_name'] . ' (MetodeQu) — pesan otomatis, abaikan.';
            }

            $result = (new WaSender(Database::connection(), $this->gateway))->send([
                'type' => 'test_send',
                'phone' => $phone,
                'message' => $message,
                'pondok_id' => $context['pondok_id'],
                'device_id' => $context['device_id'],
            ]);

            if ($result['status'] !== 'sent') {
                Response::json([
                    'success' => false,
                    'message' => 'Gagal mengirim: ' . ($result['error'] ?? 'gateway tidak merespons'),
                    'data' => $result,
                ], 400);
            }

            Response::json(['success' => true, 'message' => 'Pesan test terkirim ke ' . $phone . '.', 'data' => $result]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    /** Kirim ulang pesan yang gagal. */
    public function resend(Request $request): never
    {
        try {
            $context = $this->context($request, fromQuery: false);
            if ($context['device_id'] === null) {
                throw new RegistrationException('Buat device pondok dulu.', 422, ['device' => 'Buat device dulu.']);
            }

            $id = (int) ($request->body()['id'] ?? 0);
            $statement = Database::connection()->prepare(
                'SELECT id, type, status, recipient_phone_e164, payload
                 FROM whatsapp_outbox
                 WHERE id = :id AND pondok_id = :pondok_id
                 LIMIT 1'
            );
            $statement->execute(['id' => $id, 'pondok_id' => $context['pondok_id']]);
            $row = $statement->fetch(PDO::FETCH_ASSOC);

            if (!is_array($row)) {
                throw new RegistrationException('Pesan tidak ditemukan.', 404, ['id' => 'Pesan tidak ditemukan.']);
            }
            if ($row['status'] === 'sent') {
                throw new RegistrationException('Pesan sudah terkirim.', 422, ['id' => 'Pesan sudah terkirim.']);
            }

            $payload = json_decode((string) $row['payload'], true);
            $message = is_array($payload) ? (string) ($payload['message'] ?? '') : '';

            $result = (new WaSender(Database::connection(), $this->gateway))->send([
                'type' => (string) $row['type'],
                'phone' => (string) $row['recipient_phone_e164'],
                'message' => $message,
                'pondok_id' => $context['pondok_id'],
                'device_id' => $context['device_id'],
            ]);

            if ($result['status'] !== 'sent') {
                Response::json([
                    'success' => false,
                    'message' => 'Gagal mengirim ulang: ' . ($result['error'] ?? 'gateway tidak merespons'),
                    'data' => $result,
                ], 400);
            }

            Response::json(['success' => true, 'message' => 'Pesan dikirim ulang.', 'data' => $result]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
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
