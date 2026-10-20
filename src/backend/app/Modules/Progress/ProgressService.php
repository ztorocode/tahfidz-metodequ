<?php

declare(strict_types=1);

namespace App\Modules\Progress;

use App\Modules\Auth\RegistrationException;
use PDO;

/**
 * Sinkronisasi isian progress harian santri.
 *
 * Satu baris per (santri, pondok, pekan, hari). Perangkat menyimpan otomatis
 * setiap kolom/checklist berubah; baris offline dikirim ulang saat kembali
 * online. Penyelesaian konflik memakai last-write-wins berbasis versi.
 */
final class ProgressService
{
    private const DAYS = ['sabtu', 'ahad', 'senin', 'selasa', 'rabu', 'kamis'];

    public function __construct(private readonly PDO $pdo)
    {
    }

    /** Isian progress milik login ini untuk satu pekan. */
    public function load(array $actor, int $pondokId, int $week): array
    {
        $this->assertPondokMember($actor, $pondokId);
        $this->assertWeek($week);

        $statement = $this->pdo->prepare(
            'SELECT day_code, fields, checks, completion_percent, version, client_updated_at, updated_at
             FROM member_progress
             WHERE user_id = :user_id AND pondok_id = :pondok_id AND week_no = :week
               AND deleted_at IS NULL'
        );
        $statement->execute([
            'user_id' => (int) $actor['id'],
            'pondok_id' => $pondokId,
            'week' => $week,
        ]);

        $days = [];
        foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $days[(string) $row['day_code']] = [
                'fields' => $this->decodeJson($row['fields'] !== null ? (string) $row['fields'] : null),
                'checks' => $this->decodeJson($row['checks'] !== null ? (string) $row['checks'] : null),
                'completion_percent' => (int) $row['completion_percent'],
                'version' => (int) $row['version'],
                'client_updated_at' => $row['client_updated_at'] !== null ? (string) $row['client_updated_at'] : null,
                'updated_at' => (string) $row['updated_at'],
            ];
        }

        return ['week' => $week, 'days' => $days];
    }

    /**
     * Simpan satu hari. Last-write-wins berbasis versi.
     *
     * @param array{pondok_id:int,week:int,day:string,fields:array,checks:array,completion_percent:int,version?:int,client_updated_at?:string} $input
     * @return array<string,mixed>
     */
    public function save(array $actor, array $input): array
    {
        $pondokId = (int) ($input['pondok_id'] ?? 0);
        $this->assertPondokMember($actor, $pondokId);

        $week = (int) ($input['week'] ?? 0);
        $this->assertWeek($week);

        $day = (string) ($input['day'] ?? '');
        if (!in_array($day, self::DAYS, true)) {
            throw new RegistrationException('Hari tidak dikenal.', 422, ['day' => 'Hari tidak dikenal.']);
        }

        $percent = max(0, min(100, (int) ($input['completion_percent'] ?? 0)));
        $fields = $this->encodeJson(is_array($input['fields'] ?? null) ? $input['fields'] : []);
        $checks = $this->encodeJson(is_array($input['checks'] ?? null) ? $input['checks'] : []);
        $clientUpdatedAt = trim((string) ($input['client_updated_at'] ?? ''));
        if ($clientUpdatedAt === '') {
            $clientUpdatedAt = date('Y-m-d H:i:s') . '.000';
        }
        $clientVersion = max(0, (int) ($input['version'] ?? 0));

        $current = $this->row($actor['id'], $pondokId, $week, $day);
        $currentVersion = $current !== null ? (int) $current['version'] : 0;
        $currentClientAt = $current !== null && $current['client_updated_at'] !== null
            ? (string) $current['client_updated_at']
            : '';

        // Idempoten: kiriman ulang dari antrean offline dengan stempel yang sama tidak mengulang versi.
        if ($current !== null && $currentClientAt !== '' && $currentClientAt === $clientUpdatedAt) {
            return $this->rowPayload($current);
        }

        // Perangkat menyimpan versi yang lebih lama → data server lebih baru, jangan ditimpa.
        if ($current !== null && $clientVersion < $currentVersion && $clientUpdatedAt < $currentClientAt) {
            return $this->rowPayload($current) + ['conflict' => true];
        }

        $halaqahId = $this->currentHalaqahId($actor['id'], $pondokId);
        $nextVersion = $currentVersion + 1;

        if ($current === null) {
            $statement = $this->pdo->prepare(
                'INSERT INTO member_progress
                    (user_id, pondok_id, halaqah_id, week_no, day_code, fields, checks,
                     completion_percent, version, client_updated_at)
                 VALUES
                    (:user_id, :pondok_id, :halaqah_id, :week, :day, :fields, :checks,
                     :percent, :version, :client_updated_at)'
            );
            $statement->execute([
                'user_id' => (int) $actor['id'],
                'pondok_id' => $pondokId,
                'halaqah_id' => $halaqahId,
                'week' => $week,
                'day' => $day,
                'fields' => $fields,
                'checks' => $checks,
                'percent' => $percent,
                'version' => $nextVersion,
                'client_updated_at' => $clientUpdatedAt,
            ]);
        } else {
            $statement = $this->pdo->prepare(
                'UPDATE member_progress
                 SET fields = :fields, checks = :checks, completion_percent = :percent,
                     halaqah_id = :halaqah_id, version = :version, client_updated_at = :client_updated_at,
                     deleted_at = NULL
                 WHERE id = :id'
            );
            $statement->execute([
                'fields' => $fields,
                'checks' => $checks,
                'percent' => $percent,
                'halaqah_id' => $halaqahId,
                'version' => $nextVersion,
                'client_updated_at' => $clientUpdatedAt,
                'id' => (int) $current['id'],
            ]);
        }

        $saved = $this->row($actor['id'], $pondokId, $week, $day);
        return $this->rowPayload($saved ?? []);
    }

    /** Isian progress seorang santri — untuk musyrif halaqahnya atau admin pondok. */
    public function forStudent(array $actor, int $pondokId, int $userId, int $week): array
    {
        $this->assertCanViewStudent($actor, $pondokId, $userId);
        $this->assertWeek($week);

        $statement = $this->pdo->prepare(
            'SELECT day_code, fields, checks, completion_percent, version, client_updated_at, updated_at
             FROM member_progress
             WHERE user_id = :user_id AND pondok_id = :pondok_id AND week_no = :week
               AND deleted_at IS NULL'
        );
        $statement->execute(['user_id' => $userId, 'pondok_id' => $pondokId, 'week' => $week]);

        $days = [];
        foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $days[(string) $row['day_code']] = [
                'fields' => $this->decodeJson($row['fields'] !== null ? (string) $row['fields'] : null),
                'checks' => $this->decodeJson($row['checks'] !== null ? (string) $row['checks'] : null),
                'completion_percent' => (int) $row['completion_percent'],
                'updated_at' => (string) $row['updated_at'],
            ];
        }

        return ['week' => $week, 'user_id' => $userId, 'days' => $days];
    }

    /** @return array<string,mixed>|null */
    private function row(int $userId, int $pondokId, int $week, string $day): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT id, day_code, fields, checks, completion_percent, version, client_updated_at, updated_at
             FROM member_progress
             WHERE user_id = :user_id AND pondok_id = :pondok_id AND week_no = :week AND day_code = :day
               AND deleted_at IS NULL
             LIMIT 1'
        );
        $statement->execute(['user_id' => $userId, 'pondok_id' => $pondokId, 'week' => $week, 'day' => $day]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
    }

    /** @return array<string,mixed> */
    private function rowPayload(array $row): array
    {
        return [
            'day' => (string) ($row['day_code'] ?? ''),
            'fields' => $this->decodeJson($row['fields'] ?? null),
            'checks' => $this->decodeJson($row['checks'] ?? null),
            'completion_percent' => (int) ($row['completion_percent'] ?? 0),
            'version' => (int) ($row['version'] ?? 0),
            'client_updated_at' => $row['client_updated_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }

    private function currentHalaqahId(int $userId, int $pondokId): ?int
    {
        $statement = $this->pdo->prepare(
            'SELECT hm.halaqah_id
             FROM halaqah_memberships hm
             JOIN halaqahs h ON h.id = hm.halaqah_id AND h.deleted_at IS NULL
             WHERE hm.user_id = :user_id AND hm.status = \'active\' AND h.pondok_id = :pondok_id
             ORDER BY hm.joined_at DESC, hm.id DESC
             LIMIT 1'
        );
        $statement->execute(['user_id' => $userId, 'pondok_id' => $pondokId]);
        $found = $statement->fetchColumn();
        return $found === false ? null : (int) $found;
    }

    private function assertWeek(int $week): void
    {
        if ($week < 1 || $week > 5) {
            throw new RegistrationException('Pekan harus 1-5.', 422, ['week' => 'Pekan harus 1-5.']);
        }
    }

    private function assertPondokMember(array $actor, int $pondokId): void
    {
        if (in_array('super_admin', $actor['roles'] ?? [], true)) {
            return;
        }
        $statement = $this->pdo->prepare(
            'SELECT 1 FROM pondok_memberships
             WHERE pondok_id = :pondok_id AND user_id = :user_id AND status = \'active\' LIMIT 1'
        );
        $statement->execute(['pondok_id' => $pondokId, 'user_id' => (int) $actor['id']]);
        if ($statement->fetchColumn() === false) {
            throw new RegistrationException('Hanya anggota pondok yang boleh mengakses progress.', 403);
        }
    }

    /** Admin pondok, atau musyrif yang mengampu halaqah santri itu. */
    private function assertCanViewStudent(array $actor, int $pondokId, int $userId): void
    {
        if (in_array('super_admin', $actor['roles'] ?? [], true)) {
            return;
        }

        $admin = $this->pdo->prepare(
            "SELECT 1 FROM pondok_memberships
             WHERE pondok_id = :pondok_id AND user_id = :user_id
               AND role = 'admin' AND status = 'active' LIMIT 1"
        );
        $admin->execute(['pondok_id' => $pondokId, 'user_id' => (int) $actor['id']]);
        if ($admin->fetchColumn() !== false) {
            return;
        }

        $musyrif = $this->pdo->prepare(
            'SELECT 1
             FROM halaqah_memberships hm
             JOIN halaqahs h ON h.id = hm.halaqah_id AND h.deleted_at IS NULL
             JOIN musyrif_profiles mp ON mp.id = h.musyrif_profile_id
             WHERE hm.user_id = :student_id AND hm.status = \'active\'
               AND h.pondok_id = :pondok_id AND mp.user_id = :musyrif_id
             LIMIT 1'
        );
        $musyrif->execute([
            'student_id' => $userId,
            'pondok_id' => $pondokId,
            'musyrif_id' => (int) $actor['id'],
        ]);
        if ($musyrif->fetchColumn() !== false) {
            return;
        }

        throw new RegistrationException('Hanya admin pondok atau musyrif halaqah santri ini yang boleh melihat.', 403);
    }

    private function encodeJson(array $value): string
    {
        $encoded = json_encode($value, JSON_UNESCAPED_UNICODE);
        return $encoded === false ? '{}' : $encoded;
    }

    private function decodeJson(?string $json): array
    {
        if ($json === null || $json === '') {
            return [];
        }
        $decoded = json_decode($json, true);
        return is_array($decoded) ? $decoded : [];
    }
}
