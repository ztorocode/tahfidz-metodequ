<?php
declare(strict_types=1);

namespace App\Modules\Progress;

use App\Modules\Auth\RegistrationException;
use PDO;

/** Satu target halaman per santri dan halaqah, terpisah dari isian harian. */
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

    private static function metaKey(int $halaqahId): string
    {
        return 'daily_target_halaqah_' . $halaqahId;
    }

    /**
     * Untuk melihat santri lain, gunakan gate yang sama dengan Progress.
     * Perubahan target selalu hanya untuk diri sendiri.
     */
    public function show(array $actor, int $pondokId, ?int $studentId = null): array
    {
        $ownId = (int) $actor['id'];
        $userId = $studentId ?? $ownId;
        if ($userId < 1) {
            throw new RegistrationException('Santri tidak valid.', 422);
        }
        if ($userId !== $ownId) {
            if ($pondokId === 0) {
                (new PlatformProgressService($this->pdo))->forStudent($actor, $userId, 1);
            } else {
                (new ProgressService($this->pdo))->forStudent($actor, $pondokId, $userId, 1);
            }
        }
        $halaqahId = $this->halaqahId($userId, $pondokId);
        $query = $this->pdo->prepare(
            'SELECT meta_value, on_off FROM user_meta WHERE user_id = ? AND meta_key = ? LIMIT 1'
        );
        $query->execute([$userId, self::metaKey($halaqahId)]);
        $row = $query->fetch(PDO::FETCH_ASSOC);
        $value = $row ? json_decode((string) $row['meta_value'], true) : null;
        $pages = is_array($value) && (string) $row['on_off'] === 'on'
            ? ($value['pages'] ?? null) : null;
        return [
            'halaqah_id' => $halaqahId,
            'user_id' => $userId,
            'pages' => $pages !== null ? (string) $pages : null,
            'has_setting' => $row !== false,
        ];
    }

    public function save(array $actor, int $pondokId, mixed $rawPages): array
    {
        $userId = (int) $actor['id'];
        $halaqahId = $this->halaqahId($userId, $pondokId);
        if (!is_string($rawPages) && !is_numeric($rawPages) && $rawPages !== null) {
            throw new RegistrationException('Target harus berupa jumlah halaman.', 422);
        }
        $raw = trim((string) ($rawPages ?? ''));
        $pages = null;
        if ($raw !== '') {
            $normalized = str_replace(',', '.', $raw);
            if (!preg_match('/^\d{1,3}(?:\.\d{1,2})?$/D', $normalized) ||
                (float) $normalized > 999.99) {
                throw new RegistrationException('Isi target halaman dengan angka, misalnya 2 atau 2,5.', 422);
            }
            $pages = rtrim(rtrim(number_format((float) $normalized, 2, '.', ''), '0'), '.');
        }
        $value = json_encode(['pages' => $pages], JSON_THROW_ON_ERROR);
        $statement = $this->pdo->prepare(
            'INSERT INTO user_meta (user_id, meta_key, meta_value, on_off)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value), on_off = VALUES(on_off)'
        );
        $statement->execute([
            $userId, self::metaKey($halaqahId), $value, $pages === null ? 'off' : 'on',
        ]);
        return [
            'halaqah_id' => $halaqahId,
            'user_id' => $userId,
            'pages' => $pages,
            'has_setting' => true,
        ];
    }
}
