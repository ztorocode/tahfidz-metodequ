<?php

declare(strict_types=1);

namespace App\Modules\Whatsapp;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\RegistrationException;
use App\Modules\Auth\SessionService;
use App\Modules\Musyrifs\PondokAccess;
use PDO;

final class WaTemplateController
{
    /** Template bawaan; kode = kunci tunggal untuk disimpan per pondok. */
    private const DEFAULTS = [
        'reminder_hafalan' => [
            'name' => 'Reminder Hafalan',
            'body' => 'Assalamualaikum, jangan lupa setoran hafalan hari ini ya.',
        ],
        'reminder_murajaah' => [
            'name' => "Reminder Muraja'ah",
            'body' => "Pengingat muraja'ah pukul 16.00. Siapkan halaman yang akan dibaca.",
        ],
        'hasil_setoran' => [
            'name' => 'Hasil Setoran',
            'body' => 'Hasil setoran hafalan hari ini sudah tersimpan. Cek di aplikasi.',
        ],
        'motivasi_harian' => [
            'name' => 'Motivasi Harian',
            'body' => 'Semangat menghafal! Konsisten sedikit setiap hari lebih baik daripada sesekali.',
        ],
    ];

    /** Variabel yang boleh dipakai di dalam template. */
    public const VARIABLES = ['{nama}', '{halaqah}', '{musyrif}', '{pondok}'];

    /**
     * Wajib login, lalu dicek akses admin pondoknya.
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

    private function pondokId(Request $request, bool $fromQuery): int
    {
        $pondokId = (int) ($fromQuery ? ($request->query['pondok_id'] ?? 0) : ($request->body()['pondok_id'] ?? 0));
        if ($pondokId < 1) {
            throw new RegistrationException('pondok_id wajib diisi.', 422, ['pondok_id' => 'pondok_id wajib diisi.']);
        }

        PondokAccess::assertPondokAdmin(Database::connection(), $this->actor($request), $pondokId);

        return $pondokId;
    }

    public function index(Request $request): never
    {
        try {
            $pondokId = $this->pondokId($request, fromQuery: true);
            $pdo = Database::connection();

            $statement = $pdo->prepare('SELECT code, body FROM pondok_wa_templates WHERE pondok_id = :id');
            $statement->execute(['id' => $pondokId]);
            $stored = [];
            foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $stored[(string) $row['code']] = (string) $row['body'];
            }

            $items = [];
            foreach (self::DEFAULTS as $code => $meta) {
                $items[] = [
                    'code' => $code,
                    'name' => $meta['name'],
                    'body' => $stored[$code] ?? $meta['body'],
                ];
            }

            Response::json(['success' => true, 'data' => ['items' => $items, 'variables' => self::VARIABLES]]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    public function save(Request $request): never
    {
        try {
            $body = $request->body();
            $pondokId = $this->pondokId($request, fromQuery: false);
            $code = (string) ($body['code'] ?? '');
            $text = trim((string) ($body['body'] ?? ''));

            if (!isset(self::DEFAULTS[$code])) {
                throw new RegistrationException('Template tidak dikenal.', 422, ['code' => 'Template tidak dikenal.']);
            }
            if ($text === '') {
                throw new RegistrationException('Isi template tidak boleh kosong.', 422, ['body' => 'Isi template tidak boleh kosong.']);
            }
            if (mb_strlen($text) > 1000) {
                throw new RegistrationException('Template maksimal 1000 karakter.', 422, ['body' => 'Maksimal 1000 karakter.']);
            }

            $statement = Database::connection()->prepare(
                'INSERT INTO pondok_wa_templates (pondok_id, code, body) VALUES (:pondok_id, :code, :body)
                 ON DUPLICATE KEY UPDATE body = VALUES(body)'
            );
            $statement->execute(['pondok_id' => $pondokId, 'code' => $code, 'body' => $text]);

            Response::json(['success' => true, 'message' => 'Template disimpan.', 'data' => [
                'code' => $code,
                'name' => self::DEFAULTS[$code]['name'],
                'body' => $text,
            ]]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }
}
