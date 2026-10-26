<?php

declare(strict_types=1);

namespace App\Modules\Setoran;

use App\Core\Database;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Auth\LoginValidator;
use App\Modules\Auth\RegistrationException;
use App\Modules\Auth\SessionService;
use PDO;

final class SetoranSubmissionController
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::connection();
    }

    /** @return array{id:int,roles:string[]} */
    private function actor(Request $request): array
    {
        $sessions = new SessionService($this->pdo, new LoginValidator());
        $user = $sessions->userFromToken(SessionService::bearerToken($request->headers));

        if ($user === null) {
            Response::json(['success' => false, 'message' => 'Sesi tidak valid atau sudah berakhir.'], 401);
        }

        return ['id' => (int) $user['id'], 'roles' => $user['roles'] ?? []];
    }

    /**
     * Upload rekaman setoran (multipart/form-data: audio, week_no, day_code, pondok_id opsional).
     *
     * Santri wajib punya halaqah + musyrif; pondok diturunkan dari halaqah itu,
     * jadi member tidak harus punya pondok_memberships sendiri.
     */
    public function store(Request $request): never
    {
        try {
            $actor = $this->actor($request);

            $pondokId = (int) ($_POST['pondok_id'] ?? 0);
            $weekNo = (int) ($_POST['week_no'] ?? 0);
            $dayCode = (string) ($_POST['day_code'] ?? '');

            if ($weekNo < 1 || $weekNo > 5) {
                throw new RegistrationException('Pekan tidak valid.', 422, ['week_no' => 'Pekan tidak valid.']);
            }
            $validDays = ['sabtu', 'ahad', 'senin', 'selasa', 'rabu', 'kamis'];
            if (!in_array($dayCode, $validDays, true)) {
                throw new RegistrationException('Hari tidak valid.', 422, ['day_code' => 'Hari tidak valid.']);
            }

            // Halaqah aktif santri = sumber kebenaran; pondok diturunkan dari halaqah.
            $halaqahStmt = $this->pdo->prepare(
                'SELECT hm.halaqah_id, h.pondok_id
                 FROM halaqah_memberships hm
                 JOIN halaqahs h ON h.id = hm.halaqah_id AND h.deleted_at IS NULL
                 WHERE hm.user_id = :uid AND hm.status = "active"' .
                 ($pondokId > 0 ? ' AND h.pondok_id = :pid' : '') . '
                 ORDER BY hm.joined_at DESC, hm.id DESC
                 LIMIT 1'
            );
            $params = ['uid' => $actor['id']];
            if ($pondokId > 0) {
                $params['pid'] = $pondokId;
            }
            $halaqahStmt->execute($params);
            $membership = $halaqahStmt->fetch(PDO::FETCH_ASSOC);

            if (!is_array($membership)) {
                $message = $pondokId > 0
                    ? 'Anda belum tergabung di halaqah pondok ini. Hubungi musyrif untuk dimasukkan ke halaqah.'
                    : 'Anda belum punya halaqah. Hubungi musyrif untuk dimasukkan ke halaqah.';
                throw new RegistrationException($message, 422, ['halaqah_id' => $message]);
            }

            $halaqahId = (int) $membership['halaqah_id'];
            $pondokId = (int) $membership['pondok_id'];

            if (!isset($_FILES['audio']) || $_FILES['audio']['error'] !== UPLOAD_ERR_OK) {
                throw new RegistrationException('Rekaman audio wajib dikirim.', 422, ['audio' => 'Rekaman audio wajib dikirim.']);
            }

            $file = $_FILES['audio'];
            $maxBytes = 25 * 1024 * 1024; // 25MB
            if ($file['size'] > $maxBytes) {
                throw new RegistrationException('Ukuran rekaman maksimal 25MB.', 422, ['audio' => 'Ukuran rekaman maksimal 25MB.']);
            }

            $allowedMimes = [
                'audio/webm', 'video/webm',
                'audio/ogg', 'application/ogg',
                'audio/mpeg', 'audio/mp4', 'audio/x-m4a',
                'audio/x-wav', 'audio/wav', 'audio/vnd.wave',
            ];
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mime = (string) $finfo->file($file['tmp_name']);
            if (!in_array($mime, $allowedMimes, true)) {
                $detected = $mime === '' ? 'tidak terdeteksi' : $mime;
                throw new RegistrationException(
                    'Format audio tidak didukung (terdeteksi: ' . $detected . ').',
                    422,
                    ['audio' => 'Format audio tidak didukung.']
                );
            }

            // Simpan file.
            $ext = match (true) {
                str_contains($mime, 'webm') => 'webm',
                str_contains($mime, 'ogg') || str_contains($mime, 'oga') => 'ogg',
                str_contains($mime, 'mpeg') => 'mp3',
                str_contains($mime, 'mp4') || str_contains($mime, 'm4a') => 'm4a',
                default => 'wav',
            };
            $dir = dirname(__DIR__, 3) . '/storage/setoran/' . $actor['id'];
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            $filename = sprintf('%d_%d_%s_%d.%s', $weekNo, $pondokId, $dayCode, time(), $ext);
            $dest = $dir . '/' . $filename;
            if (!move_uploaded_file($file['tmp_name'], $dest)) {
                throw new RegistrationException('Gagal menyimpan rekaman.', 500, []);
            }

            $audioPath = 'setoran/' . $actor['id'] . '/' . $filename;

            $stmt = $this->pdo->prepare(
                'INSERT INTO setoran_submissions (user_id, pondok_id, halaqah_id, week_no, day_code, audio_path, mime_type, file_size)
                 VALUES (:uid, :pid, :hid, :week, :day, :path, :mime, :size)'
            );
            $stmt->execute([
                'uid' => $actor['id'],
                'pid' => $pondokId,
                'hid' => $halaqahId,
                'week' => $weekNo,
                'day' => $dayCode,
                'path' => $audioPath,
                'mime' => $mime,
                'size' => $file['size'],
            ]);

            Response::json([
                'success' => true,
                'message' => 'Setoran terkirim ke musyrif.',
                'data' => [
                    'id' => (int) $this->pdo->lastInsertId(),
                    'audio_path' => $audioPath,
                    'halaqah_id' => $halaqahId,
                    'pondok_id' => $pondokId,
                ],
            ]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }

    /** Streaming file audio (untuk musyrif memutar setoran). */
    public function audio(Request $request): never
    {
        $actor = $this->actor($request);
        $id = (int) ($request->query['id'] ?? 0);
        if ($id < 1) {
            Response::json(['success' => false, 'message' => 'ID tidak valid.'], 422);
        }

        $stmt = $this->pdo->prepare(
            'SELECT s.*, u.name AS student_name FROM setoran_submissions s
             JOIN users u ON u.id = s.user_id
             WHERE s.id = :id AND s.deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            Response::json(['success' => false, 'message' => 'Setoran tidak ditemukan.'], 404);
        }

        // Santri boleh dengar miliknya; musyrif halaqah & admin pondok juga.
        $isOwner = (int) $row['user_id'] === (int) $actor['id'];
        if (!$isOwner) {
            $allowed = in_array('super_admin', $actor['roles'] ?? [], true);
            if (!$allowed && in_array('musyrif', $actor['roles'] ?? [], true)) {
                $check = $this->pdo->prepare(
                    'SELECT 1 FROM halaqah_memberships hm
                     JOIN musyrif_profiles mp ON mp.user_id = :musyrif_id
                     JOIN halaqahs h ON h.id = hm.halaqah_id AND h.musyrif_profile_id = mp.id
                     WHERE hm.user_id = :student_id AND hm.halaqah_id = :hid AND hm.status = "active" LIMIT 1'
                );
                $check->execute([
                    'student_id' => (int) $row['user_id'],
                    'hid' => (int) $row['halaqah_id'],
                    'musyrif_id' => (int) $actor['id'],
                ]);
                $allowed = $check->fetchColumn() !== false;
            }
            if (!$allowed) {
                $admin = $this->pdo->prepare(
                    'SELECT 1 FROM pondok_memberships WHERE pondok_id = :pid AND user_id = :uid AND role = "admin" AND status = "active" LIMIT 1'
                );
                $admin->execute(['pid' => (int) $row['pondok_id'], 'uid' => (int) $actor['id']]);
                $allowed = $admin->fetchColumn() !== false;
            }
            if (!$allowed) {
                Response::json(['success' => false, 'message' => 'Tidak punya akses.'], 403);
            }
        }

        $file = dirname(__DIR__, 3) . '/storage/' . $row['audio_path'];
        if (!is_file($file)) {
            Response::json(['success' => false, 'message' => 'File tidak ditemukan.'], 404);
        }

        header('Content-Type: ' . $row['mime_type']);
        header('Content-Length: ' . filesize($file));
        header('Content-Disposition: inline; filename="' . basename($file) . '"');
        readfile($file);
        exit;
    }

    /** Daftar setoran (santri: miliknya; musyrif: halaqahnya; admin: pondoknya). */
    public function index(Request $request): never
    {
        try {
            $actor = $this->actor($request);
            $pondokId = (int) ($request->query['pondok_id'] ?? 0);
            $weekNo = (int) ($request->query['week_no'] ?? 0);

            if ($pondokId < 1) {
                throw new RegistrationException('Pondok tidak diketahui.', 422, ['pondok_id' => 'Pondok tidak diketahui.']);
            }

            $sql = 'SELECT s.*, u.name AS student_name, h.name AS halaqah_name
                    FROM setoran_submissions s
                    JOIN users u ON u.id = s.user_id
                    LEFT JOIN halaqahs h ON h.id = s.halaqah_id
                    WHERE s.pondok_id = :pid AND s.deleted_at IS NULL';
            $params = ['pid' => $pondokId];

            if ($weekNo >= 1 && $weekNo <= 5) {
                $sql .= ' AND s.week_no = :week';
                $params['week'] = $weekNo;
            }

            $isSuperAdmin = in_array('super_admin', $actor['roles'] ?? [], true);
            if (!$isSuperAdmin) {
                $isMusyrif = in_array('musyrif', $actor['roles'] ?? [], true);
                if ($isMusyrif) {
                    $sql .= ' AND s.halaqah_id IN (
                        SELECT h.id FROM halaqahs h
                        JOIN musyrif_profiles mp ON mp.id = h.musyrif_profile_id
                        WHERE mp.user_id = :mid AND h.status = "active"
                    )';
                    $params['mid'] = (int) $actor['id'];
                } else {
                    $sql .= ' AND s.user_id = :uid';
                    $params['uid'] = (int) $actor['id'];
                }
            }

            $sql .= ' ORDER BY s.created_at DESC LIMIT 200';
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $out = array_map(static fn (array $row): array => [
                'id' => (int) $row['id'],
                'user_id' => (int) $row['user_id'],
                'student_name' => (string) $row['student_name'],
                'halaqah_name' => $row['halaqah_name'] !== null ? (string) $row['halaqah_name'] : null,
                'week_no' => (int) $row['week_no'],
                'day_code' => (string) $row['day_code'],
                'mime_type' => (string) $row['mime_type'],
                'file_size' => (int) $row['file_size'],
                'status' => (string) $row['status'],
                'created_at' => (string) $row['created_at'],
            ], $rows);

            Response::json(['success' => true, 'data' => $out]);
        } catch (RegistrationException $exception) {
            Response::json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors,
            ], $exception->statusCode);
        }
    }
}
