<?php

declare(strict_types=1);

namespace App\Modules\Progress;

use App\Modules\Auth\RegistrationException;
use PDO;

/**
 * Target halaman milik halaqah, tidak terkait progres hari tertentu.
 * Pembaca: santri aktif atau Ustadz yang boleh meninjau progres santri.
 * Penulis: hanya Ustadz pembimbing aktif halaqah tersebut.
 */
final class DailyTargetService
{
    public function __construct(private readonly PDO $pdo) {}

    private function halaqahId(int $userId, int $pondokId): int
    {
        if ($userId < 1 || $pondokId < 0) {
            throw new RegistrationException('Santri atau konteks tidak valid.', 422);
        }
        $scope = $pondokId === 0 ? 'h.pondok_id IS NULL' : 'h.pondok_id = :pondok_id';
        $query = $this->pdo->prepare(
            "SELECT h.id FROM halaqah_memberships hm
             JOIN halaqahs h ON h.id = hm.halaqah_id
             WHERE hm.user_id = :user_id AND hm.status = 'active'
               AND h.status = 'active' AND h.deleted_at IS NULL
               AND {$scope}
             ORDER BY hm.joined_at DESC, hm.id DESC LIMIT 1"
        );
        $params = ['user_id' => $userId];
        if ($pondokId > 0) $params['pondok_id'] = $pondokId;
        $query->execute($params);
        $id = $query->fetchColumn();
        if ($id === false) {
            throw new RegistrationException('Santri belum menjadi anggota halaqah aktif.', 403);
        }
        return (int) $id;
    }

    public function show(array $actor, int $pondokId, ?int $studentId = null): array
    {
        $userId = $studentId ?? (int) $actor['id'];
        if ($userId < 1) {
            throw new RegistrationException('Santri tidak valid.', 422);
        }
        if ($userId !== (int) $actor['id']) {
            if ($pondokId === 0) {
                (new PlatformProgressService($this->pdo))->forStudent($actor, $userId, 1);
            } else {
                (new ProgressService($this->pdo))->forStudent($actor, $pondokId, $userId, 1);
            }
        }
        $halaqahId = $this->halaqahId($userId, $pondokId);
        $query = $this->pdo->prepare(
            "SELECT daily_target_pages FROM halaqahs
             WHERE id = ? AND status = 'active' AND deleted_at IS NULL"
        );
        $query->execute([$halaqahId]);
        $pages = $query->fetchColumn();
        if ($pages === false) {
            throw new RegistrationException('Halaqah tidak ditemukan.', 404);
        }
        return [
            'halaqah_id' => $halaqahId,
            'user_id' => $userId,
            'pages' => $pages !== null ? self::formatPages((string) $pages) : null,
            'has_setting' => $pages !== null,
        ];
    }

    private static function formatPages(string $pages): string
    {
        return rtrim(rtrim($pages, '0'), '.');
    }

    public function save(array $actor, int $pondokId, int $halaqahId, mixed $rawPages): array
    {
        if ($halaqahId < 1 || $pondokId < 0) {
            throw new RegistrationException('Halaqah atau konteks tidak valid.', 422);
        }
        if (!in_array('musyrif', $actor['roles'] ?? [], true)) {
            throw new RegistrationException('Hanya Ustadz pembimbing yang dapat mengatur target harian.', 403);
        }
        if (!is_string($rawPages) && !is_numeric($rawPages) && $rawPages !== null) {
            throw new RegistrationException('Target harus berupa jumlah halaman.', 422);
        }
        $raw = trim((string) ($rawPages ?? ''));
        $pages = null;
        if ($raw !== '') {
            $normalized = str_replace(',', '.', $raw);
            if (!preg_match('/^\d{1,3}(?:\.\d{1,2})?$/D', $normalized) ||
                (float) $normalized <= 0 || (float) $normalized > 999.99) {
                throw new RegistrationException('Isi target halaman lebih dari nol, misalnya 2 atau 2,5.', 422);
            }
            $pages = number_format((float) $normalized, 2, '.', '');
        }

        // Periksa kepemilikan melalui hubungan halaqah -> profil Ustadz.
        $scope = $pondokId === 0 ? 'h.pondok_id IS NULL' : 'h.pondok_id = :pondok_id';
        $check = $this->pdo->prepare(
            "SELECT h.id FROM halaqahs h
             JOIN musyrif_profiles mp ON mp.id = h.musyrif_profile_id AND mp.status = 'active'
             JOIN users u ON u.id = mp.user_id AND u.status = 'active' AND u.deleted_at IS NULL
             WHERE h.id = :halaqah_id AND h.status = 'active' AND h.deleted_at IS NULL
               AND mp.user_id = :user_id AND {$scope} LIMIT 1"
        );
        $params = ['halaqah_id' => $halaqahId, 'user_id' => (int) $actor['id']];
        if ($pondokId > 0) $params['pondok_id'] = $pondokId;
        $check->execute($params);
        if ($check->fetchColumn() === false) {
            throw new RegistrationException('Hanya Ustadz pembimbing halaqah ini yang dapat mengatur target.', 403);
        }

        $update = $this->pdo->prepare(
            "UPDATE halaqahs SET daily_target_pages = ?
             WHERE id = ? AND status = 'active' AND deleted_at IS NULL"
        );
        $update->execute([$pages, $halaqahId]);
        return [
            'halaqah_id' => $halaqahId,
            'pages' => $pages !== null ? self::formatPages($pages) : null,
            'has_setting' => $pages !== null,
        ];
    }
}
