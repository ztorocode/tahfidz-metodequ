<?php

declare(strict_types=1);

namespace App\Modules\Halaqah;

use App\Core\PondokDashboard;
use App\Modules\Auth\RegistrationException;
use PDO;

final class HalaqahService
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @param array{id:int,roles:string[]} $actor @return list<array<string,mixed>> */
    public function list(array $actor, int $pondokId): array
    {
        $this->assertPondokMember($actor, $pondokId);

        $statement = $this->pdo->prepare(
            'SELECT h.id, h.name, h.program_start_date, u.id AS musyrif_user_id, u.name AS musyrif_name
             FROM halaqahs h
             LEFT JOIN musyrif_profiles mp ON mp.id = h.musyrif_profile_id
             LEFT JOIN users u ON u.id = mp.user_id
             WHERE h.pondok_id = :pondok_id AND h.status = \'active\' AND h.deleted_at IS NULL
             ORDER BY h.name'
        );
        $statement->execute(['pondok_id' => $pondokId]);
        $halaqahs = $statement->fetchAll(PDO::FETCH_ASSOC);

        if (!$halaqahs) {
            return [];
        }

        $memberStatement = $this->pdo->prepare(
            'SELECT hm.halaqah_id, u.id, u.name, u.email,
                    (SELECT COUNT(*)
                     FROM submission_reviews r
                     JOIN submissions s ON s.id = r.submission_id
                     WHERE s.user_id = u.id AND s.pondok_id = :pid_mutqin
                       AND r.decision = \'mutqin\' AND s.deleted_at IS NULL) AS mutqin,
                    (SELECT COUNT(*)
                     FROM submissions sp
                     WHERE sp.user_id = u.id AND sp.pondok_id = :pid_pending
                       AND sp.status = \'pending\' AND sp.deleted_at IS NULL) AS pending
             FROM halaqah_memberships hm
             JOIN users u ON u.id = hm.user_id
             JOIN halaqahs h ON h.id = hm.halaqah_id
             WHERE hm.status = \'active\' AND h.pondok_id = :pondok_id AND h.deleted_at IS NULL
             ORDER BY u.name'
        );
        $memberStatement->execute([
            'pondok_id' => $pondokId,
            'pid_mutqin' => $pondokId,
            'pid_pending' => $pondokId,
        ]);

        $byHalaqah = [];
        foreach ($memberStatement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $byHalaqah[(int) $row['halaqah_id']][] = [
                'id' => (int) $row['id'],
                'name' => (string) $row['name'],
                'email' => (string) $row['email'],
                'mutqin' => (int) $row['mutqin'],
                'pending' => (int) $row['pending'],
                'status' => 'Aktif',
            ];
        }

        return array_map(static function (array $row) use ($byHalaqah): array {
            $id = (int) $row['id'];
            return [
                'id' => $id,
                'name' => (string) $row['name'],
                'program_start_date' => $row['program_start_date'] !== null ? (string) $row['program_start_date'] : null,
                'musyrif_user_id' => $row['musyrif_user_id'] !== null ? (int) $row['musyrif_user_id'] : null,
                'musyrif_name' => $row['musyrif_name'] !== null ? (string) $row['musyrif_name'] : null,
                'students' => $byHalaqah[$id] ?? [],
            ];
        }, $halaqahs);
    }

    /** Halaqah milik aktor (sebagai santri binaan atau musyrif pengampu). */
    public function mine(array $actor, int $pondokId): ?array
    {
        $this->assertPondokMember($actor, $pondokId);

        $statement = $this->pdo->prepare(
            "SELECT h.id, h.name, h.program_start_date, mu.name AS musyrif_name, 'santri' AS role, hm.joined_at AS joined_at
             FROM halaqah_memberships hm
             JOIN halaqahs h ON h.id = hm.halaqah_id AND h.deleted_at IS NULL
             LEFT JOIN musyrif_profiles mp ON mp.id = h.musyrif_profile_id
             LEFT JOIN users mu ON mu.id = mp.user_id
             WHERE hm.user_id = :user_id AND hm.status = 'active'
               AND h.pondok_id = :pondok_id AND h.status = 'active'
             UNION
             SELECT h.id, h.name, h.program_start_date, mu.name AS musyrif_name, 'musyrif' AS role, NULL AS joined_at
             FROM halaqahs h
             JOIN musyrif_profiles mp ON mp.id = h.musyrif_profile_id
             JOIN users mu ON mu.id = mp.user_id
             WHERE mp.user_id = :user_id2 AND h.pondok_id = :pondok_id2
               AND h.status = 'active' AND h.deleted_at IS NULL
             ORDER BY joined_at DESC, id DESC
             LIMIT 1"
        );
        $statement->execute([
            'user_id' => (int) $actor['id'],
            'pondok_id' => $pondokId,
            'user_id2' => (int) $actor['id'],
            'pondok_id2' => $pondokId,
        ]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            return null;
        }

        return [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'program_start_date' => $row['program_start_date'] !== null ? (string) $row['program_start_date'] : null,
            'musyrif_name' => $row['musyrif_name'] !== null ? (string) $row['musyrif_name'] : null,
            'role' => (string) $row['role'],
        ];
    }

    /** Atur tanggal mulai program (Hari ke-1) — admin pondok atau musyrif halaqah itu. */
    public function setStartDate(array $actor, array $input): array
    {
        $pondokId = (int) ($input['pondok_id'] ?? 0);
        $halaqahId = (int) ($input['halaqah_id'] ?? 0);
        $halaqah = $this->halaqahRow($halaqahId, $pondokId);
        if ($halaqah === null) {
            throw new RegistrationException('Halaqah tidak ditemukan.', 404, ['halaqah_id' => 'Halaqah tidak ditemukan.']);
        }

        $this->assertCanManage($actor, $pondokId, $halaqahId);

        $date = trim((string) ($input['program_start_date'] ?? ''));
        if ($date === '') {
            // Kosongkan = hapus pengaturan, kembali ke asumsi Pekan 1 Sabtu.
            $update = $this->pdo->prepare(
                'UPDATE halaqahs SET program_start_date = NULL WHERE id = :id'
            );
            $update->execute(['id' => $halaqahId]);
            return ['halaqah_id' => $halaqahId, 'program_start_date' => null];
        }

        $parsed = \DateTime::createFromFormat('Y-m-d', $date);
        if (!$parsed || $parsed->format('Y-m-d') !== $date) {
            throw new RegistrationException('Tanggal tidak valid.', 422, ['program_start_date' => 'Tanggal tidak valid.']);
        }

        $update = $this->pdo->prepare(
            'UPDATE halaqahs SET program_start_date = :date WHERE id = :id'
        );
        $update->execute(['date' => $date, 'id' => $halaqahId]);

        return ['halaqah_id' => $halaqahId, 'program_start_date' => $date];
    }

    /** Admin pondok, atau musyrif yang mengampu halaqah itu. */
    private function assertCanManage(array $actor, int $pondokId, int $halaqahId): void
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
            'SELECT 1 FROM halaqahs h
             JOIN musyrif_profiles mp ON mp.id = h.musyrif_profile_id
             WHERE h.id = :halaqah_id AND mp.user_id = :user_id LIMIT 1'
        );
        $musyrif->execute(['halaqah_id' => $halaqahId, 'user_id' => (int) $actor['id']]);
        if ($musyrif->fetchColumn() !== false) {
            return;
        }

        throw new RegistrationException('Hanya admin pondok atau musyrif halaqah ini yang boleh mengatur tanggal mulai.', 403);
    }

    /** @param array{id:int,roles:string[]} $actor @return array<string,mixed> */
    public function create(array $actor, array $input): array
    {
        $pondokId = (int) ($input['pondok_id'] ?? 0);
        $this->assertPondokAdmin($actor, $pondokId);

        $name = trim((string) ($input['name'] ?? ''));
        if ($name === '') {
            throw new RegistrationException('Nama halaqah wajib diisi.', 422, ['name' => 'Nama halaqah wajib diisi.']);
        }
        if (mb_strlen($name) > 150) {
            throw new RegistrationException('Nama halaqah maksimal 150 karakter.', 422, ['name' => 'Nama halaqah maksimal 150 karakter.']);
        }

        $musyrifUserId = (int) ($input['musyrif_user_id'] ?? 0);
        if ($musyrifUserId > 0) {
            $this->assertMusyrifOfPondok($musyrifUserId, $pondokId);
        }

        try {
            $statement = $this->pdo->prepare(
                'INSERT INTO halaqahs (pondok_id, name) VALUES (:pondok_id, :name)'
            );
            $statement->execute(['pondok_id' => $pondokId, 'name' => $name]);
        } catch (\PDOException $exception) {
            if ((string) $exception->getCode() === '23000') {
                throw new RegistrationException('Nama halaqah sudah dipakai di pondok ini.', 409, ['name' => 'Nama halaqah sudah dipakai.']);
            }
            throw $exception;
        }

        $halaqahId = (int) $this->pdo->lastInsertId();
        if ($musyrifUserId > 0) {
            $this->assignMusyrif($halaqahId, $musyrifUserId, $pondokId);
        }

        PondokDashboard::refreshQuietly($this->pdo, $pondokId);

        return ['id' => $halaqahId, 'name' => $name, 'musyrif_user_id' => $musyrifUserId > 0 ? $musyrifUserId : null];
    }

    /** @param array{id:int,roles:string[]} $actor @return array<string,mixed> */
    public function setMembers(array $actor, array $input): array
    {
        $pondokId = (int) ($input['pondok_id'] ?? 0);
        $this->assertPondokAdmin($actor, $pondokId);

        $halaqahId = (int) ($input['halaqah_id'] ?? 0);
        $halaqah = $this->halaqahRow($halaqahId, $pondokId);
        if ($halaqah === null) {
            throw new RegistrationException('Halaqah tidak ditemukan.', 404, ['halaqah_id' => 'Halaqah tidak ditemukan.']);
        }

        $userIds = array_values(array_unique(array_map(
            'intval',
            is_array($input['user_ids'] ?? null) ? $input['user_ids'] : []
        )));

        // Hanya santri aktif pondok ini yang boleh dimasukkan.
        $valid = [];
        if ($userIds) {
            $placeholders = implode(',', array_fill(0, count($userIds), '?'));
            $statement = $this->pdo->prepare(
                "SELECT user_id FROM pondok_memberships
                 WHERE pondok_id = ? AND role = 'santri' AND status = 'active'
                   AND user_id IN ($placeholders)"
            );
            $statement->execute(array_merge([$pondokId], $userIds));
            foreach ($statement->fetchAll(PDO::FETCH_COLUMN) as $found) {
                $valid[] = (int) $found;
            }
        }

        // Keluarkan yang tidak dipilih lagi.
        $leave = $this->pdo->prepare(
            'UPDATE halaqah_memberships
             SET status = \'left\', ended_at = CURRENT_TIMESTAMP(3)
             WHERE halaqah_id = :halaqah_id AND status = \'active\''
            . ($valid ? ' AND user_id NOT IN (' . implode(',', array_map('intval', $valid)) . ')' : '')
        );
        $leave->execute(['halaqah_id' => $halaqahId]);

        // Satu santri hanya boleh aktif di satu halaqah per pondok.
        // Menempatkan santri ke halaqah ini otomatis menutup keanggotaannya di
        // halaqah lain pada pondok yang sama, supaya tidak ada santri yang
        // nyangkut di dua halaqah sekaligus (pindah halaqah manual).
        if ($valid) {
            $inList = implode(',', array_map('intval', $valid));
            $closeOther = $this->pdo->prepare(
                'UPDATE halaqah_memberships hm
                 JOIN halaqahs h ON h.id = hm.halaqah_id AND h.deleted_at IS NULL
                 SET hm.status = \'left\', hm.ended_at = CURRENT_TIMESTAMP(3)
                 WHERE hm.status = \'active\'
                   AND hm.halaqah_id <> :halaqah_id
                   AND h.pondok_id = :pondok_id
                   AND hm.user_id IN (' . $inList . ')'
            );
            $closeOther->execute(['halaqah_id' => $halaqahId, 'pondok_id' => $pondokId]);
        }

        foreach ($valid as $userId) {
            $check = $this->pdo->prepare(
                'SELECT id FROM halaqah_memberships WHERE halaqah_id = :halaqah_id AND user_id = :user_id LIMIT 1'
            );
            $check->execute(['halaqah_id' => $halaqahId, 'user_id' => $userId]);
            $existing = $check->fetchColumn();

            if ($existing !== false) {
                $update = $this->pdo->prepare(
                    'UPDATE halaqah_memberships
                     SET status = \'active\', ended_at = NULL, joined_at = CURRENT_TIMESTAMP(3)
                     WHERE id = :id'
                );
                $update->execute(['id' => (int) $existing]);
            } else {
                $insert = $this->pdo->prepare(
                    'INSERT INTO halaqah_memberships (halaqah_id, user_id, status)
                     VALUES (:halaqah_id, :user_id, \'active\')'
                );
                $insert->execute(['halaqah_id' => $halaqahId, 'user_id' => $userId]);
            }
        }

        PondokDashboard::refreshQuietly($this->pdo, $pondokId);

        return ['halaqah_id' => $halaqahId, 'students' => count($valid)];
    }

    private function halaqahRow(int $halaqahId, int $pondokId): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT id, name FROM halaqahs
             WHERE id = :id AND pondok_id = :pondok_id AND deleted_at IS NULL LIMIT 1'
        );
        $statement->execute(['id' => $halaqahId, 'pondok_id' => $pondokId]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        return is_array($row) ? $row : null;
    }

    private function assignMusyrif(int $halaqahId, int $userId, int $pondokId): void
    {
        $upsert = $this->pdo->prepare(
            "INSERT INTO musyrif_profiles (user_id, type, pondok_id, status)
             VALUES (:user_id, 'pondok', :pondok_id, 'active')
             ON DUPLICATE KEY UPDATE pondok_id = :pondok_id2, status = 'active'"
        );
        $upsert->execute(['user_id' => $userId, 'pondok_id' => $pondokId, 'pondok_id2' => $pondokId]);

        $select = $this->pdo->prepare(
            'SELECT id FROM musyrif_profiles WHERE user_id = :user_id LIMIT 1'
        );
        $select->execute(['user_id' => $userId]);
        $profileId = (int) $select->fetchColumn();

        $update = $this->pdo->prepare(
            'UPDATE halaqahs SET musyrif_profile_id = :profile_id WHERE id = :id'
        );
        $update->execute(['profile_id' => $profileId, 'id' => $halaqahId]);
    }

    private function assertMusyrifOfPondok(int $userId, int $pondokId): void
    {
        $statement = $this->pdo->prepare(
            "SELECT 1 FROM pondok_memberships
             WHERE pondok_id = :pondok_id AND user_id = :user_id
               AND role = 'musyrif' AND status = 'active' LIMIT 1"
        );
        $statement->execute(['pondok_id' => $pondokId, 'user_id' => $userId]);
        if ($statement->fetchColumn() === false) {
            throw new RegistrationException('Musyrif tidak terdaftar di pondok ini.', 422, ['musyrif_user_id' => 'Musyrif tidak terdaftar di pondok ini.']);
        }
    }

    /** @param array{id:int,roles:string[]} $actor */
    private function assertPondokAdmin(array $actor, int $pondokId): void
    {
        \App\Modules\Musyrifs\PondokAccess::assertPondokAdmin($this->pdo, $actor, $pondokId);
    }

    /** @param array{id:int,roles:string[]} $actor */
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
        if ($statement->fetchColumn() !== false) {
            return;
        }
        // Santri berhalaqah di pondok ini dianggap terkait pondok (tanpa pondok_memberships).
        $viaHalaqah = $this->pdo->prepare(
            'SELECT 1 FROM halaqah_memberships hm
             JOIN halaqahs h ON h.id = hm.halaqah_id AND h.deleted_at IS NULL
             WHERE hm.user_id = :user_id AND hm.status = \'active\' AND h.pondok_id = :pondok_id
             LIMIT 1'
        );
        $viaHalaqah->execute(['pondok_id' => $pondokId, 'user_id' => (int) $actor['id']]);
        if ($viaHalaqah->fetchColumn() === false) {
            throw new RegistrationException('Hanya anggota pondok yang boleh melihat daftar halaqah.', 403);
        }
    }
}
