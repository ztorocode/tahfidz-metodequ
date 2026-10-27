<?php

declare(strict_types=1);

namespace App\Modules\Halaqah;

use App\Core\PondokDashboard;
use App\Core\StudentActivityLog;
use App\Modules\Auth\RegistrationException;
use PDO;

final class HalaqahService
{
    /** Urutan hari program (Jum'at libur). */
    private const PROGRESS_DAYS = ['sabtu', 'ahad', 'senin', 'selasa', 'rabu', 'kamis'];

    /** Batas halaqah yang boleh dibuat sendiri oleh satu musyrif platform. */
    private const PLATFORM_HALAQAH_LIMIT = 5;

    public function __construct(private readonly PDO $pdo)
    {
    }

    /** Id profil musyrif platform milik aktor, atau null bila bukan musyrif platform. */
    private function platformProfileId(array $actor): ?int
    {
        $statement = $this->pdo->prepare(
            "SELECT id FROM musyrif_profiles
             WHERE user_id = :user_id AND type = 'platform' AND status = 'active'
             LIMIT 1"
        );
        $statement->execute(['user_id' => (int) $actor['id']]);
        $id = $statement->fetchColumn();
        return $id !== false ? (int) $id : null;
    }

    /**
     * Tipe musyrif diturunkan dari pondok_memberships (sumber tunggal aturan):
     * punya keanggotaan aktif role='musyrif' = musyrif pondok; tanpa keanggotaan
     * = musyrif platform. Profil type='platform' lama tetap dihormati agar
     * data platform yang sudah ada tidak berubah arti.
     *
     * @param array{id:int,roles:string[]} $actor
     */
    private function isPlatformMusyrif(array $actor): bool
    {
        if ($this->platformProfileId($actor) !== null) {
            return true;
        }
        if (!in_array('musyrif', $actor['roles'] ?? [], true)) {
            return false;
        }

        $statement = $this->pdo->prepare(
            "SELECT 1 FROM pondok_memberships
             WHERE user_id = :user_id AND role = 'musyrif' AND status = 'active' LIMIT 1"
        );
        $statement->execute(['user_id' => (int) $actor['id']]);

        return $statement->fetchColumn() === false;
    }

    /** Profil platform milik aktor — dibuat otomatis saat ia pertama kali membuat halaqah platform. */
    private function ensurePlatformProfile(int $userId): int
    {
        $existing = $this->platformProfileId(['id' => $userId, 'roles' => ['musyrif']]);
        if ($existing !== null) {
            return $existing;
        }

        $upsert = $this->pdo->prepare(
            "INSERT INTO musyrif_profiles (user_id, type, pondok_id, status)
             VALUES (:user_id, 'platform', NULL, 'active')
             ON DUPLICATE KEY UPDATE type = 'platform', pondok_id = NULL, status = 'active'"
        );
        $upsert->execute(['user_id' => $userId]);

        // Nilai id yang sama dengan hasil ON DUPLICATE KEY UPDATE.
        $select = $this->pdo->prepare(
            "SELECT id FROM musyrif_profiles WHERE user_id = :user_id AND type = 'platform' LIMIT 1"
        );
        $select->execute(['user_id' => $userId]);

        return (int) $select->fetchColumn();
    }

    /** @param array{id:int,roles:string[]} $actor @return list<array<string,mixed>> */
    public function list(array $actor, int $pondokId): array
    {
        // Musyrif platform tidak terikat pondok: hanya melihat halaqah yang ia buat/ampu sendiri.
        // Tipenya diturunkan dari pondok_memberships (tanpa keanggotaan = platform).
        if ($pondokId < 1 && $this->isPlatformMusyrif($actor)) {
            $platformProfileId = $this->platformProfileId($actor);
            return $platformProfileId !== null ? $this->listPlatformOwn($platformProfileId) : [];
        }

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

        // Ringkasan progress terakhir tiap santri (hari ke-N + persen isian),
        // dipakai daftar santri pada kartu halaqah musyrif.
        $progressStatement = $this->pdo->prepare(
            'SELECT user_id, week_no, day_code, completion_percent, updated_at
             FROM member_progress
             WHERE pondok_id = :pondok_id AND deleted_at IS NULL
             ORDER BY user_id, updated_at DESC'
        );
        $progressStatement->execute(['pondok_id' => $pondokId]);
        $progressByUser = [];
        foreach ($progressStatement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $studentId = (int) $row['user_id'];
            if (isset($progressByUser[$studentId])) {
                continue; // baris pertama = isian paling baru
            }
            $week = max(1, min(5, (int) $row['week_no']));
            $dayIndex = array_search((string) $row['day_code'], self::PROGRESS_DAYS, true);
            $progressByUser[$studentId] = [
                'day' => ($week - 1) * 6 + ($dayIndex === false ? 0 : (int) $dayIndex) + 1,
                'percent' => max(0, min(100, (int) $row['completion_percent'])),
                'updated_at' => (string) $row['updated_at'],
            ];
        }

        return array_map(static function (array $row) use ($byHalaqah, $progressByUser): array {
            $id = (int) $row['id'];
            $students = array_map(static function (array $student) use ($progressByUser): array {
                $progress = $progressByUser[(int) $student['id']] ?? null;
                $student['progress_day'] = $progress !== null ? $progress['day'] : null;
                $student['progress_percent'] = $progress !== null ? $progress['percent'] : null;
                $student['progress_updated_at'] = $progress !== null ? $progress['updated_at'] : null;
                return $student;
            }, $byHalaqah[$id] ?? []);

            return [
                'id' => $id,
                'name' => (string) $row['name'],
                'program_start_date' => $row['program_start_date'] !== null ? (string) $row['program_start_date'] : null,
                'musyrif_user_id' => $row['musyrif_user_id'] !== null ? (int) $row['musyrif_user_id'] : null,
                'musyrif_name' => $row['musyrif_name'] !== null ? (string) $row['musyrif_name'] : null,
                'students' => $students,
            ];
        }, $halaqahs);
    }

    /**
     * Daftar halaqah yang dibuat/diampu sendiri oleh musyrif platform
     * (halaqah tanpa pondok: pondok_id NULL).
     */
    private function listPlatformOwn(int $profileId): array
    {
        $statement = $this->pdo->prepare(
            "SELECT h.id, h.name, h.program_start_date, u.id AS musyrif_user_id, u.name AS musyrif_name
             FROM halaqahs h
             JOIN musyrif_profiles mp ON mp.id = h.musyrif_profile_id
             LEFT JOIN users u ON u.id = mp.user_id
             WHERE h.musyrif_profile_id = :profile_id AND h.status = 'active' AND h.deleted_at IS NULL
             ORDER BY h.id"
        );
        $statement->execute(['profile_id' => $profileId]);
        $halaqahs = $statement->fetchAll(PDO::FETCH_ASSOC);

        if (!$halaqahs) {
            return [];
        }

        $ids = array_map(static fn (array $row): int => (int) $row['id'], $halaqahs);
        $inList = implode(',', array_map('intval', $ids));

        $memberStatement = $this->pdo->prepare(
            'SELECT hm.halaqah_id, u.id, u.name, u.email,
                    (SELECT COUNT(*)
                     FROM submission_reviews r
                     JOIN submissions s ON s.id = r.submission_id
                     WHERE s.user_id = u.id AND s.halaqah_id = hm.halaqah_id
                       AND r.decision = \'mutqin\' AND s.deleted_at IS NULL) AS mutqin,
                    (SELECT COUNT(*)
                     FROM submissions sp
                     WHERE sp.user_id = u.id AND sp.halaqah_id = hm.halaqah_id
                       AND sp.status = \'pending\' AND sp.deleted_at IS NULL) AS pending
             FROM halaqah_memberships hm
             JOIN users u ON u.id = hm.user_id
             JOIN halaqahs h ON h.id = hm.halaqah_id AND h.deleted_at IS NULL
             WHERE hm.status = \'active\' AND hm.halaqah_id IN (' . $inList . ')
             ORDER BY u.name'
        );
        $memberStatement->execute();
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

        // Ringkasan progress terakhir tiap santri dalam halaqah milik musyrif ini.
        $progressByUser = [];
        $memberUserIds = [];
        foreach ($byHalaqah as $students) {
            foreach ($students as $student) {
                $memberUserIds[(int) $student['id']] = true;
            }
        }
        if ($memberUserIds !== []) {
            $userIn = implode(',', array_map('intval', array_keys($memberUserIds)));
            $progressStatement = $this->pdo->prepare(
                'SELECT user_id, week_no, day_code, completion_percent, updated_at
                 FROM member_progress
                 WHERE user_id IN (' . $userIn . ') AND deleted_at IS NULL
                 ORDER BY user_id, updated_at DESC'
            );
            $progressStatement->execute();
            foreach ($progressStatement->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $studentId = (int) $row['user_id'];
                if (isset($progressByUser[$studentId])) {
                    continue; // baris pertama = isian paling baru
                }
                $week = max(1, min(5, (int) $row['week_no']));
                $dayIndex = array_search((string) $row['day_code'], self::PROGRESS_DAYS, true);
                $progressByUser[$studentId] = [
                    'day' => ($week - 1) * 6 + ($dayIndex === false ? 0 : (int) $dayIndex) + 1,
                    'percent' => max(0, min(100, (int) $row['completion_percent'])),
                    'updated_at' => (string) $row['updated_at'],
                ];
            }
        }

        (new StudentActivityLog($this->pdo))->ensureTable();
        $activityStatement = $this->pdo->prepare(
            'SELECT a.halaqah_id, a.user_id, u.name AS student_name,
                    a.activity_key, a.activity_count, a.occurred_at
             FROM student_learning_activities a
             JOIN users u ON u.id = a.user_id
             WHERE a.halaqah_id IN (' . $inList . ')
             ORDER BY a.occurred_at DESC, a.id DESC
             LIMIT 50'
        );
        $activityStatement->execute();
        $activitiesByHalaqah = [];
        foreach ($activityStatement->fetchAll(PDO::FETCH_ASSOC) as $activity) {
            $activitiesByHalaqah[(int) $activity['halaqah_id']][] = [
                'user_id' => (int) $activity['user_id'],
                'student_name' => (string) $activity['student_name'],
                'activity_key' => (string) $activity['activity_key'],
                'activity_count' => $activity['activity_count'] !== null ? (int) $activity['activity_count'] : null,
                'activity_at' => (string) $activity['occurred_at'],
            ];
        }

        return array_map(static function (array $row) use ($byHalaqah, $progressByUser, $activitiesByHalaqah): array {
            $id = (int) $row['id'];
            $students = array_map(static function (array $student) use ($progressByUser): array {
                $progress = $progressByUser[(int) $student['id']] ?? null;
                $student['progress_day'] = $progress !== null ? $progress['day'] : null;
                $student['progress_percent'] = $progress !== null ? $progress['percent'] : null;
                $student['progress_updated_at'] = $progress !== null ? $progress['updated_at'] : null;
                return $student;
            }, $byHalaqah[$id] ?? []);

            return [
                'id' => $id,
                'name' => (string) $row['name'],
                'program_start_date' => $row['program_start_date'] !== null ? (string) $row['program_start_date'] : null,
                'musyrif_user_id' => $row['musyrif_user_id'] !== null ? (int) $row['musyrif_user_id'] : null,
                'musyrif_name' => $row['musyrif_name'] !== null ? (string) $row['musyrif_name'] : null,
                'students' => $students,
                'activities' => $activitiesByHalaqah[$id] ?? [],
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

    /**
     * Musyrif platform membuat halaqah sendiri: tanpa pondok, ia otomatis jadi
     * pengampu, dan maksimal PLATFORM_HALAQAH_LIMIT halaqah miliknya.
     */
    private function createPlatformHalaqah(array $actor, array $input, int $profileId, int $pondokId): array
    {
        if ($pondokId > 0) {
            throw new RegistrationException(
                'Musyrif platform tidak terikat pondok. Halaqah platform dibuat tanpa pondok.',
                403,
                ['pondok_id' => 'Musyrif platform tidak dapat membuat halaqah milik pondok tertentu.'],
            );
        }

        $name = trim((string) ($input['name'] ?? ''));
        if ($name === '') {
            throw new RegistrationException('Nama halaqah wajib diisi.', 422, ['name' => 'Nama halaqah wajib diisi.']);
        }
        if (mb_strlen($name) > 150) {
            throw new RegistrationException('Nama halaqah maksimal 150 karakter.', 422, ['name' => 'Nama halaqah maksimal 150 karakter.']);
        }

        // Musyrif platform hanya boleh membuat halaqah untuk dirinya sendiri.
        $musyrifUserId = (int) ($input['musyrif_user_id'] ?? 0);
        if ($musyrifUserId > 0 && $musyrifUserId !== (int) $actor['id']) {
            throw new RegistrationException(
                'Musyrif platform hanya dapat mengampu halaqah yang ia buat sendiri.',
                403,
                ['musyrif_user_id' => 'Musyrif platform tidak boleh menugaskan musyrif lain.'],
            );
        }

        $count = $this->pdo->prepare(
            "SELECT COUNT(*) FROM halaqahs
             WHERE musyrif_profile_id = :profile_id AND status = 'active' AND deleted_at IS NULL"
        );
        $count->execute(['profile_id' => $profileId]);
        if ((int) $count->fetchColumn() >= self::PLATFORM_HALAQAH_LIMIT) {
            throw new RegistrationException(
                'Anda sudah membuat ' . self::PLATFORM_HALAQAH_LIMIT . ' halaqah — batas maksimal tercapai.',
                403,
                ['halaqah' => 'Maksimal ' . self::PLATFORM_HALAQAH_LIMIT . ' halaqah per musyrif platform.'],
            );
        }

        $statement = $this->pdo->prepare(
            'INSERT INTO halaqahs (pondok_id, name, musyrif_profile_id) VALUES (NULL, :name, :profile_id)'
        );
        $statement->execute(['name' => $name, 'profile_id' => $profileId]);

        $halaqahId = (int) $this->pdo->lastInsertId();

        return [
            'id' => $halaqahId,
            'name' => $name,
            'musyrif_user_id' => (int) $actor['id'],
            'platform_halaqah' => true,
        ];
    }

    /** @param array{id:int,roles:string[]} $actor @return array<string,mixed> */
    public function create(array $actor, array $input): array
    {
        $pondokId = (int) ($input['pondok_id'] ?? 0);

        if ($this->isPlatformMusyrif($actor)) {
            // Profil platform dibuat otomatis saat pertama kali dipakai.
            $profileId = $this->ensurePlatformProfile((int) $actor['id']);
            return $this->createPlatformHalaqah($actor, $input, $profileId, $pondokId);
        }

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

    /**
     * Edit nama halaqah dan/atau musyrif pengampu — khusus admin pondok;
     * musyrif platform hanya boleh mengedit nama halaqah miliknya sendiri.
     * Body: pondok_id, halaqah_id, name (wajib), musyrif_user_id (opsional;
     * null/0 = kosongkan penugasan musyrif; diabaikan untuk halaqah platform).
     *
     * @param array{id:int,roles:string[]} $actor
     * @return array<string,mixed>
     */
    public function update(array $actor, array $input): array
    {
        $pondokId = (int) ($input['pondok_id'] ?? 0);
        // Musyrif platform (pondok_id < 1) mengedit halaqah miliknya sendiri.
        $platformOwn = $pondokId < 1 && $this->isPlatformMusyrif($actor);

        $halaqahId = (int) ($input['halaqah_id'] ?? 0);
        if ($platformOwn) {
            $fetch = $this->pdo->prepare(
                'SELECT id, name FROM halaqahs
                 WHERE id = :id AND pondok_id IS NULL AND musyrif_profile_id = :profile_id AND deleted_at IS NULL LIMIT 1'
            );
            $fetch->execute(['id' => $halaqahId, 'profile_id' => $this->platformProfileId($actor)]);
            $halaqah = $fetch->fetch(PDO::FETCH_ASSOC) ?: null;
        } else {
            $this->assertPondokAdmin($actor, $pondokId);
            $halaqah = $this->halaqahRow($halaqahId, $pondokId);
        }
        if ($halaqah === null) {
            throw new RegistrationException('Halaqah tidak ditemukan.', 404, ['halaqah_id' => 'Halaqah tidak ditemukan.']);
        }

        $name = trim((string) ($input['name'] ?? ''));
        if ($name === '') {
            throw new RegistrationException('Nama halaqah wajib diisi.', 422, ['name' => 'Nama halaqah wajib diisi.']);
        }
        if (mb_strlen($name) > 150) {
            throw new RegistrationException('Nama halaqah maksimal 150 karakter.', 422, ['name' => 'Nama halaqah maksimal 150 karakter.']);
        }

        // Perubahan musyrif hanya berlaku untuk halaqah pondok;
        // halaqah platform selalu mengabaikan field musyrif_user_id.
        $musyrifUserId = $platformOwn ? 0 : (int) ($input['musyrif_user_id'] ?? 0);
        if ($musyrifUserId > 0) {
            $this->assertMusyrifOfPondok($musyrifUserId, $pondokId);
        }

        try {
            $update = $this->pdo->prepare(
                'UPDATE halaqahs SET name = :name WHERE id = :id'
            );
            $update->execute(['name' => $name, 'id' => $halaqahId]);
        } catch (\PDOException $exception) {
            if ((string) $exception->getCode() === '23000') {
                throw new RegistrationException('Nama halaqah sudah dipakai di pondok ini.', 409, ['name' => 'Nama halaqah sudah dipakai.']);
            }
            throw $exception;
        }

        if (!$platformOwn && array_key_exists('musyrif_user_id', $input)) {
            if ($musyrifUserId > 0) {
                $this->assignMusyrif($halaqahId, $musyrifUserId, $pondokId);
            } else {
                // Pilihan "tanpa musyrif": lepas penugasan.
                $clear = $this->pdo->prepare(
                    'UPDATE halaqahs SET musyrif_profile_id = NULL WHERE id = :id'
                );
                $clear->execute(['id' => $halaqahId]);
            }
        }

        // Dashboard ringkas hanya untuk halaqah milik pondok (bukan platform).
        if (!$platformOwn) {
            PondokDashboard::refreshQuietly($this->pdo, $pondokId);
        }

        $statement = $this->pdo->prepare(
            'SELECT h.id, h.name, u.id AS musyrif_user_id, u.name AS musyrif_name
             FROM halaqahs h
             LEFT JOIN musyrif_profiles mp ON mp.id = h.musyrif_profile_id
             LEFT JOIN users u ON u.id = mp.user_id
             WHERE h.id = :id LIMIT 1'
        );
        $statement->execute(['id' => $halaqahId]);
        $row = $statement->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'id' => (int) ($row['id'] ?? $halaqahId),
            'name' => (string) ($row['name'] ?? $name),
            'musyrif_user_id' => isset($row['musyrif_user_id']) && $row['musyrif_user_id'] !== null ? (int) $row['musyrif_user_id'] : null,
            'musyrif_name' => isset($row['musyrif_name']) && $row['musyrif_name'] !== null ? (string) $row['musyrif_name'] : null,
        ];
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
